import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb'

/**
 * GET /api/ai-diagnostics
 * Retorna o status das variáveis de ambiente e contagem de itens AI no banco.
 * Útil para debugar quando as imagens AI não aparecem.
 * ⚠️  Remova ou proteja este endpoint antes de ir para produção pública.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const envStatus = {
    HF_API_KEY: !!process.env.HF_API_KEY,
    HF_TEXT_MODEL: process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta (padrão)',
    HF_IMAGE_MODEL: process.env.HF_IMAGE_MODEL || 'runwayml/stable-diffusion-v1-5 (padrão)',
    OPENAI_API_KEY: !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY),
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo (padrão)',
    OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1 (padrão)',
    STABLE_HORDE_KEY: !!process.env.STABLE_HORDE_KEY,
    AI_DAILY_GENERATION_LIMIT: Number(process.env.AI_DAILY_GENERATION_LIMIT || 6),
    VAPID_PUBLIC_KEY: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
    MONGODB_URI: !!process.env.MONGODB_URI,
  }

  const noAIProvider =
    !envStatus.HF_API_KEY && !envStatus.OPENAI_API_KEY && !envStatus.STABLE_HORDE_KEY

  let dbCounts: Record<string, number> = {}
  try {
    const db = await getDb()
    const collections = ['images', 'images_sentences', 'images_proverbs']
    for (const col of collections) {
      dbCounts[col] = await db.collection(col).countDocuments({ source: 'ai' })
    }
  } catch (e: any) {
    dbCounts = { error: e?.message || 'Falha ao conectar ao MongoDB' } as any
  }

  return res.status(200).json({
    ok: !noAIProvider,
    warning: noAIProvider
      ? 'Nenhum provedor de IA configurado. Defina HF_API_KEY ou OPENAI_API_KEY no Vercel.'
      : null,
    env: envStatus,
    aiItemsInDB: dbCounts,
    instructions: noAIProvider
      ? [
          '1. Acesse Vercel → Settings → Environment Variables',
          '2. Adicione HF_API_KEY com sua chave do huggingface.co/settings/tokens',
          '3. Ou adicione OPENAI_API_KEY com sua chave OpenAI',
          '4. Redeploy o projeto para as variáveis serem reconhecidas',
        ]
      : ['Configuração OK. Verifique os logs do Vercel para detalhes de cada geração.'],
  })
}
