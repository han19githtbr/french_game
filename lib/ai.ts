import { getDb } from './mongodb';
import { notifyNewAIImages } from './push-notifications';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const DAILY_AI_GENERATION_LIMIT = Number(process.env.AI_DAILY_GENERATION_LIMIT || '6');

// Hugging Face / Stable Horde (free/community) fallbacks
const HF_API_KEY = process.env.HF_API_KEY;
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'runwayml/stable-diffusion-v1-5';
const STABLE_HORDE_KEY = process.env.STABLE_HORDE_KEY;
const MAX_DATA_URL_BYTES = Number(process.env.AI_MAX_DATA_URL_BYTES || '900000');

const normalizeTheme = (theme: string) => theme.toLowerCase();

// Timeout wrapper — evita que a Vercel Lambda trave aguardando HF/Horde
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
    return `Você é um assistente que gera apenas JSON. Crie ${count} legendas curtas em francês para imagens de vocabulário de ${themeDescription}. Cada item deve vir no formato {"title":"...", "description":"..."}, onde title é o texto curto exibido como resposta e description é uma frase rápida que ajuda o aluno a conectar a imagem ao significado. Responda somente com um array JSON válido.`;
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

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
};

const parseJsonResponse = (text: string) => {
  try {
    return JSON.parse(extractJsonArray(text));
  } catch (error) {
    const sanitized = extractJsonArray(text)
      .replace(/\/\/[^\n]*/g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    return JSON.parse(sanitized);
  }
};

const normalizeCaptionItems = (items: any[]) =>
  items
    .map((item: any) => ({
      title: String(item.title || item.text || item.caption || '').trim(),
      description: String(item.description || item.hint || item.caption || item.text || '').trim(),
    }))
    .filter((item: any) => item.title);

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
        body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true }, parameters: { max_new_tokens: 300 } }),
      }, 20000);
      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || '';
        let text: string;
        if (contentType.includes('application/json')) {
          const data = await resp.json();
          // HF can return [{generated_text: '...'}] or {generated_text: '...'}
          if (Array.isArray(data) && data[0]?.generated_text) text = data[0].generated_text;
          else if (data.generated_text) text = data.generated_text;
          else text = String(data);
        } else {
          text = await resp.text();
        }

        const parsed = parseJsonResponse(text);
        if (!Array.isArray(parsed)) throw new Error('Resposta HF inválida');
        return normalizeCaptionItems(parsed);
      }
    } catch (err) {
      console.warn('Hugging Face text fallback falhou, tentando próximo provedor:', err);
    }
  }

  // 2) OpenAI (legacy) if configured
  if (OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'Você responde apenas com JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao chamar OpenAI: ${response.status} ${body}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Resposta da AI vazia.');
    }

    const parsed = parseJsonResponse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Formato de resposta AI inválido. Esperado array JSON.');
    }

    return normalizeCaptionItems(parsed);
  }

  return [];
};

const generateAIImageUrl = async (theme: string, seed: number) => {
  const prompt = `Uma ilustração colorida e amigável para aprender francês sobre ${theme}. A imagem deve ser clara, educativa e adequada para um jogo de vocabulário.`;

  // 1) Hugging Face image model (returns binary image)
  if (HF_API_KEY) {
    try {
      const url = `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`;
      console.log('[AI] Tentando HF image model:', HF_IMAGE_MODEL);
      const resp = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/octet-stream',
        },
        body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
      }, 25000);

      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        if (buffer.byteLength > MAX_DATA_URL_BYTES) {
          console.warn(`Imagem HF maior que o limite configurado (${buffer.byteLength} bytes). Usando placeholder.`);
          return buildPlaceholderUrl(theme, seed);
        }
        const b64 = Buffer.from(buffer).toString('base64');
        // Return data URL so we can store it directly in DB as `url` if needed
        return `data:image/png;base64,${b64}`;
      }
    } catch (err) {
      console.warn('Hugging Face image generation falhou, tentando próximo provedor:', err);
    }
  }

  // 2) Stable Horde
  if (STABLE_HORDE_KEY) {
    try {
      const resp = await fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': STABLE_HORDE_KEY },
        body: JSON.stringify({
          prompt,
          params: { steps: 20 },
          nsfw: false,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        // Stable Horde async returns a job id; try sync endpoint instead
      }

      // try sync generate v2
      const syncResp = await fetch('https://stablehorde.net/api/v2/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': STABLE_HORDE_KEY },
        body: JSON.stringify({
          prompt,
          params: { steps: 20 },
          nsfw: false,
        }),
      });
      if (syncResp.ok) {
        const data = await syncResp.json();
        // data.images is an array of base64 strings
        const first = data?.images?.[0];
        if (first) return `data:image/png;base64,${first}`;
      }
    } catch (err) {
      console.warn('Stable Horde image generation falhou:', err);
    }
  }

  // 3) OpenAI if configured
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt,
          size: getOpenAIImageSize(),
          n: 1,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.warn(`OpenAI image generation falhou: ${response.status} ${body}`);
        return buildPlaceholderUrl(theme, seed);
      }

      const data = await response.json();
      const firstImage = data?.data?.[0];
      const url = firstImage?.url;
      const b64 = firstImage?.b64_json;

      if (url && url.startsWith('http')) {
        return url;
      }

      if (b64) {
        const dataUrl = `data:image/png;base64,${b64}`;
        if (dataUrl.length <= MAX_DATA_URL_BYTES) return dataUrl;
        console.warn('Imagem OpenAI maior que o limite configurado. Usando placeholder.');
      }

      return buildPlaceholderUrl(theme, seed);
      } catch (error) {
        console.warn('OpenAI image generation falhou:', error);
        return buildPlaceholderUrl(theme, seed);
      }
  }

  // Fallback placeholder
  return buildPlaceholderUrl(theme, seed);
};

export async function ensureDailyAIItems(collectionName: string, theme: string) {
  console.log('[AI] ====== ensureDailyAIItems START ======');
  console.log('[AI] collection:', collectionName, '| theme:', theme);
  console.log('[AI] HF_API_KEY present:', !!process.env.HF_API_KEY);
  console.log('[AI] HF_TEXT_MODEL:', HF_TEXT_MODEL);
  console.log('[AI] HF_IMAGE_MODEL:', HF_IMAGE_MODEL);
  console.log('[AI] OPENAI_API_KEY present:', !!OPENAI_API_KEY);
  console.log('[AI] OPENAI_IMAGE_MODEL:', OPENAI_IMAGE_MODEL);
  console.log('[AI] DAILY_AI_GENERATION_LIMIT:', DAILY_AI_GENERATION_LIMIT);
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
      await notifyNewAIImages(collectionName, normalizedTheme, insertedDocuments).catch(error => {
        console.warn('Erro ao enviar notificacoes push de imagens AI:', error?.message || error);
      });
    }
  }
}