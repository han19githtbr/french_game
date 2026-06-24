import { getDb } from './mongodb';
import { notifyNewAIImages } from './push-notifications';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Quantas imagens extras a IA gera por tema por dia (por título existente)
const DAILY_AI_GENERATION_LIMIT = Number(process.env.AI_DAILY_GENERATION_LIMIT || '6');

// Hugging Face / Stable Horde fallbacks
const HF_API_KEY = process.env.HF_API_KEY;
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'runwayml/stable-diffusion-v1-5';
const STABLE_HORDE_KEY = process.env.STABLE_HORDE_KEY;
const MAX_DATA_URL_BYTES = Number(process.env.AI_MAX_DATA_URL_BYTES || '900000');

const normalizeTheme = (theme: string) => theme.toLowerCase();

const normalizeText = (text: string) =>
  String(text || '')
    .trim()
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1');

const levenshteinDistance = (a: string, b: string) => {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
};

const titleSimilarity = (a: string, b: string) => {
  const first = normalizeText(a).toLowerCase();
  const second = normalizeText(b).toLowerCase();
  if (!first || !second) return 0;
  if (first === second) return 1;

  const tokensA = Array.from(new Set(first.split(/\W+/).filter(Boolean)));
  const tokensB = Array.from(new Set(second.split(/\W+/).filter(Boolean)));
  const intersection = tokensA.filter(token => tokensB.includes(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  const wordScore = union ? intersection / union : 0;
  const charScore = 1 - levenshteinDistance(first, second) / Math.max(first.length, second.length, 1);
  return Math.max(0, Math.min(1, wordScore * 0.6 + charScore * 0.4));
};

const chooseBestTitle = (candidate: string, titles: string[]) => {
  const normalizedCandidate = normalizeText(candidate).toLowerCase();
  if (!normalizedCandidate) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  titles.forEach(title => {
    const normalizedTitle = normalizeText(title).toLowerCase();
    if (!normalizedTitle) return;
    if (normalizedCandidate === normalizedTitle) {
      bestMatch = title;
      bestScore = 1;
      return;
    }

    if (normalizedCandidate.includes(normalizedTitle) || normalizedTitle.includes(normalizedCandidate)) {
      bestMatch = title;
      bestScore = Math.max(bestScore, 0.9);
      return;
    }

    const score = titleSimilarity(normalizedCandidate, normalizedTitle);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = title;
    }
  });

  return bestScore >= 0.65 ? bestMatch : null;
};

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

  const genericPattern = /\b(?:turismo|natureza|animais|tecnologia|gastronomia|cultura|pensamentos|tourisme|animaux|technologie|gastronomie|culture|pensée|objet|image|illustration|photo|scène|scene|titre)\b/i;
  if (genericPattern.test(normalized)) return true;
  if (/\d+/.test(normalized)) return true;

  return false;
};

const normalizeCaptionItems = (items: any[]) =>
  items
    .map((item: any) => ({
      title: String(item.title || item.text || item.caption || '').trim(),
      proverbText: item.proverbText ? String(item.proverbText).trim() : undefined,
      description: String(item.description || item.hint || item.caption || item.text || '').trim(),
    }))
    .filter((item: any) => item.title && !isInvalidCaptionTitle(item.title));

// ─── NOVA LÓGICA: busca títulos já existentes no banco para o tema ──────────
// Em vez de inventar títulos novos, reutiliza os títulos fixos do banco e
// gera novas imagens para eles — ampliando o pool visual sem mudar as legendas.
const fetchExistingTitlesForTheme = async (
  collectionName: string,
  theme: string,
  limit = 10,
): Promise<Array<{ title: string; description?: string; proverbText?: string }>> => {
  try {
    const db = await getDb();
    const collection = db.collection(collectionName);

    // Busca apenas itens do banco fixo (source != 'ai') para garantir qualidade
    const docs = await collection
      .find({
        theme: normalizeTheme(theme),
        title: { $exists: true, $ne: '' },
        validated: { $ne: false },
        source: { $ne: 'ai' }, // apenas itens validados pelo admin
      })
      .project({ title: 1, description: 1, proverbText: 1 })
      .toArray();

    // Embaralha e retorna até `limit` títulos únicos
    const shuffled = docs.sort(() => Math.random() - 0.5);
    const seen = new Set<string>();
    const result: Array<{ title: string; description?: string; proverbText?: string }> = [];

    for (const doc of shuffled) {
      const t = String(doc.title || '').trim();
      if (t && !seen.has(t.toLowerCase()) && !isInvalidCaptionTitle(t)) {
        seen.add(t.toLowerCase());
        result.push({
          title: t,
          description: doc.description ? String(doc.description) : undefined,
          proverbText: doc.proverbText ? String(doc.proverbText) : undefined,
        });
        if (result.length >= limit) break;
      }
    }

    return result;
  } catch (err) {
    console.warn('[AI] fetchExistingTitlesForTheme falhou:', err);
    return [];
  }
};

// ─── Gera prompt de imagem específico para um título/legenda já conhecido ───
// Antes o prompt era genérico por tema. Agora é dirigido ao título exato,
// garantindo que a imagem gerada corresponda à legenda correta no jogo.
const buildImagePromptForTitle = (
  collectionName: string,
  theme: string,
  title: string,
  proverbText?: string,
): string => {
  const normalizedTheme = normalizeTheme(theme);

  if (collectionName === 'images') {
    // Vocabulário: gera imagem que ilustra o substantivo/expressão francesa
    return `Educational illustration for French language learning. 
Theme: ${normalizedTheme}. 
The image must clearly depict: "${title}".
Style: bright, clean, colorful, educational card style. 
No text overlays. The visual should unambiguously represent the French word or expression "${title}".`;
  }

  if (collectionName === 'images_sentences') {
    // Frases: gera cena que ilustra a frase francesa
    return `Educational illustration for French language learning.
Theme: ${normalizedTheme}.
The image must depict the scene described by the French sentence: "${title}".
Style: colorful, clear, educational learning-card style. 
No text overlays. The visual should unambiguously represent the situation described.`;
  }

  // Provérbios: ilustração simbólica do ditado
  const frText = proverbText || title;
  return `Educational illustration for a French proverb or idiomatic expression.
French expression: "${frText}".
Meaning (in Portuguese): "${title}".
Style: clean symbolic illustration, educational, colorful.
No text overlays. The image should symbolically represent the meaning of the proverb.`;
};

// ─── Gera URL de imagem via IA para um título específico ────────────────────
const generateAIImageUrlForTitle = async (
  collectionName: string,
  theme: string,
  title: string,
  seed: number,
  proverbText?: string,
): Promise<string> => {
  const prompt = buildImagePromptForTitle(collectionName, theme, title, proverbText);

  // 1) Anthropic Claude com tool de geração de imagem via prompt
  //    (Claude não gera imagens diretamente — usa OpenAI como primeiro provedor)

  // 2) OpenAI image generation
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
          prompt,
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

  // 3) Hugging Face image generation
  if (HF_API_KEY) {
    try {
      const url = `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`;
      const resp = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt }),
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

  // 4) Stable Horde fallback
  if (STABLE_HORDE_KEY) {
    try {
      const asyncResp = await fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: {
          apikey: STABLE_HORDE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          params: { width: 512, height: 512, steps: 20 },
        }),
      });

      if (asyncResp.ok) {
        const asyncData = await asyncResp.json();
        const jobId = asyncData.id;

        for (let i = 0; i < 10; i++) {
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

  // 5) Placeholder como último recurso
  return buildPlaceholderUrl(theme, seed);
};

// ─── Store pending in-app notifications in MongoDB ─────────────────────────
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

// ─── resolveAIImageTitle: mantido para compatibilidade ──────────────────────
// Com a nova lógica o título já vem do banco, então esta função é usada
// apenas como validação de segurança.
export const resolveAIImageTitle = async (collectionName: string, theme: string, candidate: string) => {
  return normalizeText(candidate) || candidate;
};

// ─── FUNÇÃO PRINCIPAL: ensureDailyAIItems ───────────────────────────────────
//
// NOVA LÓGICA:
// 1. Busca os títulos FIXOS já existentes no banco para o tema
// 2. Para cada título, verifica se já existe uma imagem gerada por IA hoje
// 3. Se não, gera uma nova imagem via IA especificamente para aquele título
// 4. Salva no banco com source='ai' — o jogo passa a ter múltiplas imagens
//    para o mesmo título, ampliando a variedade visual sem alterar as legendas.
//
export const ensureDailyAIItems = async (collectionName: string, theme: string) => {
  const normalizedTheme = normalizeTheme(theme);

  const db = await getDb();
  const collection = db.collection(collectionName);

  // Índice para evitar duplicatas de (theme + title + source=ai)
  await collection.createIndex(
    { theme: 1, title: 1 },
    { unique: true, partialFilterExpression: { source: 'ai' } },
  ).catch(() => undefined);

  const today = new Date();
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  // Quantas imagens AI já foram geradas hoje para este tema
  const aiTodayCount = await collection.countDocuments({
    theme: normalizedTheme,
    source: 'ai',
    createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
  });

  const toGenerate = Math.max(0, DAILY_AI_GENERATION_LIMIT - aiTodayCount);
  if (toGenerate <= 0) {
    console.log(`[AI] Limite diário atingido para tema="${normalizedTheme}" (${aiTodayCount} geradas hoje)`);
    return;
  }

  // ── NOVA LÓGICA: busca títulos já existentes no banco ──────────────────
  const existingItems = await fetchExistingTitlesForTheme(collectionName, normalizedTheme, toGenerate);

  if (existingItems.length === 0) {
    console.warn(`[AI] Nenhum título fixo encontrado para tema="${normalizedTheme}" na coleção "${collectionName}". Abortando geração.`);
    return;
  }

  console.log(`[AI] Gerando ${existingItems.length} imagens extras para tema="${normalizedTheme}" com títulos existentes:`, existingItems.map(i => i.title));

  // ── Gera uma imagem por título já existente ─────────────────────────────
  const documents = await Promise.all(
    existingItems.map(async (item, index) => {
      const doc: any = {
        url: await generateAIImageUrlForTitle(
          collectionName,
          normalizedTheme,
          item.title,
          Date.now() + index,
          item.proverbText,
        ),
        title: item.title,           // título idêntico ao item fixo do banco
        description: item.description || '',
        theme: normalizedTheme,
        source: 'ai',
        createdAt: new Date(),
      };

      if (collectionName === 'images_proverbs' && item.proverbText) {
        doc.proverbText = item.proverbText;
      }

      return doc;
    }),
  );

  console.log(`[AI] Preparados ${documents.length} documentos para inserção no tema="${normalizedTheme}"`);

  if (documents.length === 0) return;

  const insertedDocuments: typeof documents = [];

  await collection.insertMany(documents, { ordered: false })
    .then(result => {
      const insertedIndexes = Object.keys(result.insertedIds).map(Number);
      insertedIndexes.forEach(i => {
        if (documents[i]) insertedDocuments.push(documents[i]);
      });
    })
    .catch(error => {
      // E11000 = duplicate key — normal se a imagem já existe
      console.warn('[AI] Erro ao inserir (pode ser duplicata):', error?.message);
    });

  console.log(`[AI] Inseridos ${insertedDocuments.length} novos documentos para tema="${normalizedTheme}"`);

  if (insertedDocuments.length > 0) {
    const moduleLabel =
      collectionName === 'images_sentences' ? 'frases'
      : collectionName === 'images_proverbs' ? 'ditados'
      : 'vocabulário';

    const notifTitle = '🤖 Novas imagens geradas pela IA';
    const notifBody = `${insertedDocuments.length} nova(s) imagem(ns) de ${moduleLabel} sobre "${normalizedTheme}" foram geradas.`;
    const notifTag = `ai-${collectionName}-${normalizedTheme}-${Date.now()}`;
    const notifUrl =
      collectionName === 'images' ? '/game'
      : collectionName === 'images_sentences' ? '/frases'
      : '/proverbs';

    await storeInAppNotification({
      title: notifTitle,
      body: notifBody,
      tag: notifTag,
      url: notifUrl,
      imageUrl: insertedDocuments[0]?.url?.startsWith('http') ? insertedDocuments[0].url : undefined,
      createdAt: new Date(),
    });

    notifyNewAIImages(collectionName, normalizedTheme, insertedDocuments).catch(error => {
      console.warn('[AI] Erro ao enviar Web Push:', error?.message || error);
    });
  }
};
