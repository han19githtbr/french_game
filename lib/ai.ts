import { getDb } from './mongodb';
import { notifyNewAIImages } from './push-notifications';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const DAILY_AI_GENERATION_LIMIT = Number(process.env.AI_DAILY_GENERATION_LIMIT || '6');

// Hugging Face / Stable Horde fallbacks
const HF_API_KEY = process.env.HF_API_KEY;
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'runwayml/stable-diffusion-v1-5';
const STABLE_HORDE_KEY = process.env.STABLE_HORDE_KEY;
const MAX_DATA_URL_BYTES = Number(process.env.AI_MAX_DATA_URL_BYTES || '900000');

const normalizeTheme = (theme: string) => theme.toLowerCase();

// Timeout wrapper
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const themePromptLabel = (collectionName: string, normalizedTheme: string) =>
  collectionName === 'images_proverbs'
    ? `provérbios franceses do grupo ${normalizedTheme.replace('grupo-', '')}`
    : `o tema ${normalizedTheme}`;

const buildPrompt = (collectionName: string, theme: string, count: number) => {
  const normalizedTheme = normalizeTheme(theme);
  const themeDescription = themePromptLabel(collectionName, normalizedTheme);

  if (collectionName === 'images') {
    return `Você é um assistente que gera apenas JSON. Crie ${count} legendas específicas em francês para imagens de vocabulário de ${themeDescription}. Cada item deve vir no formato {"title":"...", "description":"..."}. O campo title deve ser um substantivo ou expressão francesa muito específico que descreva com precisão um elemento visível na imagem. Nunca use palavras em português, inglês ou termos genéricos como "turismo", "natureza", "animais", "tecnologia", "gastronomia", "cultura" ou quaisquer números de sequência como "turismo 1". Exemplos válidos: "L'aéroport", "La voiture", "Les feuilles", "Un oiseau". O campo description deve ser uma frase curta em francês que ajude a conectar o título ao conteúdo da imagem. Responda somente com um array JSON válido.`;
  }

  if (collectionName === 'images_sentences') {
    return `Você é um assistente que gera apenas JSON. Crie ${count} frases simples em francês que descrevem cenas ou objetos relacionados a ${themeDescription}. Cada item deve vir no formato {"title":"...", "description":"..."}, onde title é a frase principal e description é uma dica de contexto em português. Responda somente com um array JSON válido.`;
  }

  return `Você é um assistente que gera apenas JSON. Crie ${count} explicações ou legendas em português para provérbios ou expressões francesas relacionadas a ${themeDescription}. Cada item deve vir no formato {"title":"...", "description":"..."}. Responda somente com um array JSON válido.`;
};

const buildPlaceholderUrl = (theme: string, seed: number) => {
  const safeTheme = encodeURIComponent(theme.replace(/\s+/g, '-'));
  return `https://picsum.photos/seed/${safeTheme}-${seed}/640/480`;
};

const getOpenAIImageSize = () => {
  if (OPENAI_IMAGE_MODEL === 'gpt-image-1') return '1024x1024';
  return '512x512';
};

const extractJsonArray = (text: string) => {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
};

const parseJsonResponse = (text: string) => {
  try {
    return JSON.parse(extractJsonArray(text));
  } catch {
    const sanitized = extractJsonArray(text)
      .replace(/\/\/[^\n]*/g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    return JSON.parse(sanitized);
  }
};

export const isInvalidCaptionTitle = (title: string) => {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;

  const genericPattern = /\b(?:turismo|natureza|animais|tecnologia|gastronomia|cultura|pensamentos|tourisme|natureza|animaux|technologie|gastronomie|culture|pensée|objet|image|illustration|photo|scène|scene|titre)\b/i;
  if (genericPattern.test(normalized)) return true;
  if (/\d+/.test(normalized)) return true;

  return false;
};

const normalizeCaptionItems = (items: any[]) =>
  items
    .map((item: any) => ({
      title: String(item.title || item.text || item.caption || '').trim(),
      description: String(item.description || item.hint || item.caption || item.text || '').trim(),
    }))
    .filter((item: any) => item.title && !isInvalidCaptionTitle(item.title));

const generateAICaptions = async (collectionName: string, theme: string, count: number) => {
  const prompt = buildPrompt(collectionName, theme, count);

  // 1) Hugging Face text-generation
  if (HF_API_KEY) {
    try {
      const url = `https://api-inference.huggingface.co/models/${HF_TEXT_MODEL}`;
      console.log('[AI] Tentando HF text model:', HF_TEXT_MODEL);
      const resp = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 800 } }),
      });

      if (resp.ok) {
        const data = await resp.json();
        let text = '';
        if (Array.isArray(data) && data[0]?.generated_text) text = data[0].generated_text;
        else if (data.generated_text) text = data.generated_text;

        if (text) {
          const items = parseJsonResponse(text);
          if (Array.isArray(items) && items.length > 0) {
            return normalizeCaptionItems(items);
          }
        }
      }
    } catch (err) {
      console.warn('[AI] HF text falhou:', err);
    }
  }

  // 2) OpenAI fallback
  if (OPENAI_API_KEY) {
    try {
      console.log('[AI] Tentando OpenAI text model:', OPENAI_MODEL);
      const resp = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'Você é um assistente que responde apenas com um array JSON válido. Não adicione comentários ou texto fora do JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 600,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          const items = parseJsonResponse(text);
          if (Array.isArray(items) && items.length > 0) {
            return normalizeCaptionItems(items);
          }
        }
      }
    } catch (err) {
      console.warn('[AI] OpenAI text falhou:', err);
    }
  }

  // 3) Static placeholder fallback
  console.warn('[AI] Sem provedor de texto disponível, usando placeholders estáticos.');
  return Array.from({ length: count }, (_, i) => ({
    title: `Objet ${i + 1}`,
    description: `Illustration de vocabulaire en français sur ${theme}`,
  }));
};

const generateAIImageUrl = async (theme: string, seed: number): Promise<string> => {
  // 1) OpenAI image generation
  if (OPENAI_API_KEY && OPENAI_IMAGE_MODEL) {
    try {
      const resp = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt: `Educational illustration for French vocabulary about ${theme}. The image should show a clear, concrete object or scene that can be described by a precise French title, without generic theme labels or text overlays. Bright, clean, educational style.`,
          n: 1,
          size: getOpenAIImageSize(),
          response_format: OPENAI_IMAGE_MODEL === 'gpt-image-1' ? 'b64_json' : 'url',
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.data?.[0]?.url) return data.data[0].url;
        if (data.data?.[0]?.b64_json) {
          const dataUrl = `data:image/png;base64,${data.data[0].b64_json}`;
          if (dataUrl.length <= MAX_DATA_URL_BYTES) return dataUrl;
        }
      }
    } catch (err) {
      console.warn('[AI] OpenAI image falhou:', err);
    }
  }

  // 2) Hugging Face image generation
  if (HF_API_KEY) {
    try {
      const url = `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`;
      const resp = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: `French language learning illustration about ${theme}, colorful, educational` }),
      }, 30000);

      if (resp.ok) {
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        if (dataUrl.length <= MAX_DATA_URL_BYTES) return dataUrl;
      }
    } catch (err) {
      console.warn('[AI] HF image falhou:', err);
    }
  }

  // 3) Stable Horde fallback
  if (STABLE_HORDE_KEY) {
    try {
      const asyncResp = await fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: {
          apikey: STABLE_HORDE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `French language learning about ${theme}, illustration, colorful`,
          params: { width: 512, height: 512, steps: 20 },
        }),
      });

      if (asyncResp.ok) {
        const asyncData = await asyncResp.json();
        const jobId = asyncData.id;

        // Poll for result (max 25s)
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const checkResp = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`);
          if (checkResp.ok) {
            const checkData = await checkResp.json();
            if (checkData.done) {
              const statusResp = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`);
              if (statusResp.ok) {
                const statusData = await statusResp.json();
                const imgUrl = statusData.generations?.[0]?.img;
                if (imgUrl) return imgUrl;
              }
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AI] Stable Horde falhou:', err);
    }
  }

  // 4) Placeholder image
  return buildPlaceholderUrl(theme, seed);
};

// ─── Store pending in-app notifications in MongoDB ─────────────────────────
// When Web Push isn't configured, we store notifications in the DB and let
// the frontend poll or receive them via socket.
const storeInAppNotification = async (payload: {
  title: string;
  body: string;
  tag: string;
  url: string;
  imageUrl?: string;
  createdAt: Date;
}) => {
  try {
    const db = await getDb();
    await db.collection('in_app_notifications').insertOne({
      ...payload,
      read: false,
      createdAt: payload.createdAt,
    });
  } catch (err) {
    console.warn('[AI] Falha ao salvar notificação in-app:', err);
  }
};

export const ensureDailyAIItems = async (collectionName: string, theme: string) => {
  const normalizedTheme = normalizeTheme(theme);

  const db = await getDb();
  const collection = db.collection(collectionName);

  await collection.createIndex(
    { theme: 1, title: 1 },
    { unique: true, partialFilterExpression: { source: 'ai' } },
  ).catch(() => undefined);

  const today = new Date();
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  const aiTodayCount = await collection.countDocuments({
    theme: normalizedTheme,
    source: 'ai',
    createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
  });

  const toGenerate = Math.max(0, DAILY_AI_GENERATION_LIMIT - aiTodayCount);
  if (toGenerate <= 0) {
    return;
  }

  const generated = await generateAICaptions(collectionName, normalizedTheme, toGenerate);
  const documents = await Promise.all(
    generated.map(async (item, index) => ({
      url: await generateAIImageUrl(normalizedTheme, Date.now() + index),
      title: item.title,
      description: item.description,
      theme: normalizedTheme,
      source: 'ai',
      createdAt: new Date(),
    })),
  );

  if (documents.length > 0) {
    const insertedDocuments: typeof documents = [];
    await collection.insertMany(documents, { ordered: false }).then(result => {
      const insertedIndexes = Object.keys(result.insertedIds).map(Number);
      insertedIndexes.forEach(index => {
        if (documents[index]) insertedDocuments.push(documents[index]);
      });
    }).catch((error) => {
      console.warn('Erro ao inserir itens AI no MongoDB:', error?.message);
    });

    if (insertedDocuments.length > 0) {
      // ── FIX: Try Web Push; on skip/failure, always store in-app notification ──
      const moduleLabel = collectionName === 'images_sentences'
        ? 'frases'
        : collectionName === 'images_proverbs'
          ? 'ditados'
          : 'vocabulário';

      const notifTitle = '🤖 Novas imagens geradas pela IA';
      const notifBody = `${insertedDocuments.length} nova(s) imagem(ns) de ${moduleLabel} sobre "${normalizedTheme}" foram geradas.`;
      const notifTag = `ai-${collectionName}-${normalizedTheme}-${Date.now()}`;
      const notifUrl = collectionName === 'images'
        ? '/game'
        : collectionName === 'images_sentences'
          ? '/frases'
          : '/proverbs';

      // Always store in DB (used by /api/ai-notifications endpoint + socket polling)
      await storeInAppNotification({
        title: notifTitle,
        body: notifBody,
        tag: notifTag,
        url: notifUrl,
        imageUrl: insertedDocuments[0]?.url?.startsWith('http') ? insertedDocuments[0].url : undefined,
        createdAt: new Date(),
      });

      // Also attempt Web Push (non-blocking)
      notifyNewAIImages(collectionName, normalizedTheme, insertedDocuments).then(() => {
        console.log('[AI] Web Push enviado (ou ignorado silenciosamente).');
      }).catch(error => {
        console.warn('[AI] Erro ao enviar Web Push:', error?.message || error);
      });
    }
  }
};