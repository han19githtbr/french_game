/**
 * POST /api/kling-video
 *
 * Generates a short animated video from a source image using the Kling.ai API.
 * Kling.ai docs: https://docs.kling.ai/
 *
 * Required env vars:
 *   KLING_API_KEY   — your Kling.ai access token (optional)
 *   KLING_ACCESS_KEY + KLING_SECRET_KEY — use these to generate a Kling JWT token if KLING_API_KEY is not available
 *
 * Request body:
 *   { imageUrl: string, prompt: string, duration?: number }
 *
 * Response:
 *   { videoUrl: string }
 *
 * Kling.ai image-to-video is async: we submit the job and poll until done
 * (max 90s to stay under Vercel's default lambda timeout — use maxDuration=120
 *  in vercel.json if needed).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from './auth/[...nextauth]';
import jwt from 'jsonwebtoken';

// Gera um JWT válido por 30 minutos a partir do AK e SK
function generateKlingToken(): string {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  if (!ak || !sk) throw new Error('KLING_ACCESS_KEY ou KLING_SECRET_KEY não configurados');
  
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: ak, exp: now + 1800, nbf: now - 5 },
    sk,
    { algorithm: 'HS256', header: { typ: 'JWT', alg: 'HS256' } }
  );
}


const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;
const KLING_BASE_URL = 'https://api.klingai.com';

function getKlingAuthorizationHeader(): string {
  if (KLING_API_KEY) {
    return `Bearer ${KLING_API_KEY}`;
  }

  if (KLING_ACCESS_KEY && KLING_SECRET_KEY) {
    return `Bearer ${generateKlingToken()}`;
  }

  throw new Error('KLING_API_KEY ou KLING_ACCESS_KEY/KLING_SECRET_KEY não configurados. Adicione-os no Vercel.');
}

// Vercel: set `export const config = { maxDuration: 120 }` if using Pro plan.
// Otherwise keep polling conservative (60s).
const MAX_POLL_MS = 60_000;
const POLL_INTERVAL_MS = 4_000;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Auth check — only admins can generate videos (sessions with isAdmin role)
  const session = await getServerSession(req, res, authOptions as any);
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  let authHeader: string;
  try {
    authHeader = getKlingAuthorizationHeader();
  } catch (err) {
    return res.status(503).json({
      error: err instanceof Error ? err.message : 'Kling API auth não configurada.',
    });
  }

  const { imageUrl, prompt, duration = 5 } = req.body as {
    imageUrl: string;
    prompt: string;
    duration?: number;
  };

  if (!imageUrl || !prompt) {
    return res.status(400).json({ error: 'imageUrl e prompt são obrigatórios.' });
  }

  if (prompt.trim().length < 5) {
    return res.status(400).json({ error: 'O prompt deve ter pelo menos 5 caracteres.' });
  }

  // Clamp duration between 5 and 10 (Kling.ai supported values)
  const clampedDuration = Math.min(10, Math.max(5, Number(duration) || 5));

  try {
    // ── Step 1: Submit image-to-video job ──────────────────────────────────
    const submitRes = await fetch(`${KLING_BASE_URL}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'kling-v1',
        image: imageUrl,          // public URL or base64 data URL
        prompt: prompt.trim(),
        duration: String(clampedDuration),
        cfg_scale: 0.5,
        mode: 'std',              // 'std' or 'pro'
      }),
    });

    if (!submitRes.ok) {
      const errData = await submitRes.json().catch(() => ({}));
      console.error('[Kling] Submit error:', errData);
      return res.status(submitRes.status).json({
        error: errData?.message || `Kling.ai retornou ${submitRes.status}`,
      });
    }

    const submitData = await submitRes.json();
    const taskId: string = submitData?.data?.task_id;

    if (!taskId) {
      console.error('[Kling] No task_id in response:', submitData);
      return res.status(500).json({ error: 'Kling.ai não retornou um task_id.' });
    }

    // ── Step 2: Poll for result ──────────────────────────────────────────
    const deadline = Date.now() + MAX_POLL_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(`${KLING_BASE_URL}/v1/videos/image2video/${taskId}`, {
        headers: { Authorization: authHeader },
      });

      if (!pollRes.ok) {
        console.warn('[Kling] Poll error:', pollRes.status);
        continue;
      }

      const pollData = await pollRes.json();
      const taskStatus: string = pollData?.data?.task_status;
      const taskStatusMsg: string = pollData?.data?.task_status_msg || '';

      if (taskStatus === 'succeed') {
        const videoUrl: string | undefined =
          pollData?.data?.task_result?.videos?.[0]?.url;

        if (!videoUrl) {
          return res.status(500).json({ error: 'Vídeo gerado mas URL não encontrada.' });
        }

        return res.status(200).json({ videoUrl, taskId });
      }

      if (taskStatus === 'failed') {
        console.error('[Kling] Task failed:', taskStatusMsg);
        return res.status(500).json({
          error: `Kling.ai falhou ao gerar o vídeo: ${taskStatusMsg || 'motivo desconhecido'}`,
        });
      }

      // taskStatus === 'processing' | 'submitted' → keep polling
      console.log(`[Kling] Task ${taskId} status: ${taskStatus}`);
    }

    // Timed out
    return res.status(504).json({
      error: 'Timeout ao aguardar geração do vídeo. Tente novamente ou verifique o Kling dashboard.',
      taskId,
    });
  } catch (err) {
    console.error('[Kling] Unexpected error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro interno ao chamar Kling.ai',
    });
  }
}

// Increase Vercel timeout limit (requires Pro plan or Edge runtime)
// export const config = { maxDuration: 120 };
