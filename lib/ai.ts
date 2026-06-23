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

const normalizeText = (text: string) =>
  String(text || '')
    .trim()
    .replace(/[“”]/g, '"')
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

const buildFallbackTitlePrompt = (collectionName: string, theme: string, candidate: string) => {
  const normalizedTheme = normalizeTheme(theme);
  if (collectionName === 'images') {
    return `Você é um assistente que gera apenas JSON. Dado um rascunho de título em francês: "${candidate}", gere uma nova legenda curta em francês que seja um substantivo ou expressão específica e apropriada para vocabulário sobre o tema ${normalizedTheme}. Retorne apenas um array JSON com um objeto no formato {"title":"..."}. O título deve ser preciso, concreto e não genérico.`;
  }

  if (collectionName === 'images_sentences') {
    return `Você é um assistente que gera apenas JSON. Dado um rascunho de frase em francês: "${candidate}", gere uma frase completa natural em francês que descreva uma cena ou situação relacionada ao tema ${normalizedTheme}. Retorne apenas um array JSON com um objeto no formato {"title":"..."}. O título deve ser uma frase natural, curta e descritiva.`;
  }

  return `Você é um assistente que gera apenas JSON. Dado um rascunho de explicação de provérbio: "${candidate}", gere uma explicação curta em português para um provérbio francês relacionado ao tema ${normalizedTheme}. Retorne apenas um array JSON com um objeto no formato {"title":"..."}. O título deve ser uma explicação didática de provérbio, em português, e evitar termos genéricos.`;
};

const fetchThemeTitles = async (collectionName: string, theme: string) => {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const documents = await collection
    .find({ theme: normalizeTheme(theme), title: { $exists: true, $ne: '' }, validated: { $ne: false } })
    .project({ title: 1 })
    .toArray();
  return Array.from(new Set(documents.map(doc => String(doc.title).trim()).filter(Boolean)));
};

const findClosestTitleInDb = async (collectionName: string, theme: string, candidate: string) => {
  const titles = await fetchThemeTitles(collectionName, theme);
  if (!titles.length) return null;
  return chooseBestTitle(candidate, titles);
};

const generateFallbackCaptionWithPrompt = async (collectionName: string, theme: string, prompt: string) => {
  if (!OPENAI_API_KEY) return null;

  try {
    const resp = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'Você é um assistente que responde apenas com JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 120,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return null;
    const items = parseJsonResponse(text);
    if (!Array.isArray(items) || items.length === 0) return null;
    const item = items[0];
    const title = normalizeText(String(item.title || item.text || item.caption || ''));
    return title && !isInvalidCaptionTitle(title) ? title : null;
  } catch (err) {
    console.warn('[AI] fallback caption prompt falhou:', err);
    return null;
  }
};

const generateFallbackTitle = async (collectionName: string, theme: string, candidate: string) => {
  const prompt = buildFallbackTitlePrompt(collectionName, theme, candidate);
  const titleFromPrompt = await generateFallbackCaptionWithPrompt(collectionName, theme, prompt);
  if (titleFromPrompt) return titleFromPrompt;

  const fallbackItems = await generateAICaptions(collectionName, theme, 1);
  if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
    const item = fallbackItems[0];
    const fallbackTitle = normalizeText(item.title);
    if (fallbackTitle && !isInvalidCaptionTitle(fallbackTitle)) return fallbackTitle;
  }

  const safeFallbacks = {
    images: ['La chaise', 'Le livre', 'La fenêtre', 'La tasse'],
    images_sentences: ['Le chat dort sur le canapé.', 'La famille mange ensemble.', 'Le soleil brille sur le jardin.'],
    images_proverbs: ['Ter calma nas adversidades', 'Saber ouvir antes de falar', 'Valorizar as pequenas vitórias'],
  };

  return safeFallbacks[collectionName as keyof typeof safeFallbacks][0];
};

export const resolveAIImageTitle = async (collectionName: string, theme: string, candidate: string) => {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate || isInvalidCaptionTitle(normalizedCandidate)) {
    return await generateFallbackTitle(collectionName, theme, candidate);
  }

  const dbMatch = await findClosestTitleInDb(collectionName, theme, normalizedCandidate);
  if (dbMatch) return dbMatch;

  const fallbackTitle = await generateFallbackTitle(collectionName, theme, normalizedCandidate);
  if (fallbackTitle && !isInvalidCaptionTitle(fallbackTitle)) return fallbackTitle;

  return normalizedCandidate;
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
    return `Você é um assistente que gera apenas JSON. Crie ${count} frases simples em francês que descrevem cenas ou objetos relacionados a ${themeDescription}. Cada item deve vir no formato {"title":"...", "description":"..."}, onde title é a frase principal e description é uma dica de contexto em português. Evite títulos que pareçam genéricos ou incompletos. Responda somente com um array JSON válido.`;
  }

  return `Você é um assistente que gera apenas JSON. Crie ${count} provérbios ou expressões idiomáticas francesas relacionadas a ${themeDescription}. Cada item deve vir no formato {"proverbText":"...", "title":"...", "description":"..."}. O campo "proverbText" deve ser o ditado/expressão em FRANCÊS (ex: "Au ras des pâquerettes"). O campo "title" deve ser o SIGNIFICADO em PORTUGUÊS, curto e didático (ex: "Desinteressante"). O campo "description" deve ser o significado detalhado em português precedido de asterisco (ex: "*D''un niveau très bas, inintéressant."). Nunca use termos genéricos. Responda somente com um array JSON válido.`;
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
      proverbText: item.proverbText ? String(item.proverbText).trim() : undefined,
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
            const normalized = normalizeCaptionItems(items);
            if (Array.isArray(normalized) && normalized.length > 0) return normalized;
            console.warn('[AI] HF model retornou itens, mas todos foram filtrados como inválidos.');
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
            const normalized = normalizeCaptionItems(items);
            if (Array.isArray(normalized) && normalized.length > 0) return normalized;
            console.warn('[AI] OpenAI retornou itens, mas todos foram filtrados como inválidos.');
          }
        }
      }
    } catch (err) {
      console.warn('[AI] OpenAI text falhou:', err);
    }
  }

  // 3) Static placeholder fallback — use safe, specific French nouns so they pass validation
  console.warn('[AI] Sem provedor de texto disponível ou respostas inválidas; usando placeholders válidos.');
  const safeNouns = ['La chaise', 'La table', 'La fenêtre', 'La porte', 'Le livre', 'La tasse', 'La pomme', 'Le chapeau', 'La valise', 'La voiture'];
  return Array.from({ length: count }, (_, i) => ({
    title: safeNouns[i % safeNouns.length],
    description: `Illustration de vocabulaire en français sur ${theme}`,
  }));
};

const buildImagePrompt = (collectionName: string, theme: string, proverbText?: string) => {
  const normalizedTheme = normalizeTheme(theme);
  if (collectionName === 'images') {
    return `Educational illustration for French vocabulary about ${normalizedTheme}. The image should show a clear, concrete object or scene that can be described by a precise French title, without generic theme labels or distracting overlays. Bright, clean, educational style.`;
  }

  if (collectionName === 'images_sentences') {
    return `Educational illustration for a French sentence about ${normalizedTheme}. The image should depict a scene or situation that matches a short French sentence, with clear, colorful details and a learning-card style.`;
  }

  // Proverbs: generate a flashcard-style image with the French proverb text at the top
  // and a symbolic illustration of its meaning in the body, matching the style in the reference images
  const proverbHint = proverbText ? `The French expression is: "${proverbText}". ` : '';
  return `Black and white hand-drawn illustration style educational flashcard for a French idiomatic expression. ${proverbHint}The image should have: the French expression written at the top in bold typography, a clear symbolic illustration in the center depicting the literal or figurative meaning of the expression, and a short Portuguese explanation at the bottom in smaller text. Style similar to a textbook illustration: clean lines, black ink on white background, no color, cartoon/sketch style. The illustration should clearly symbolize the meaning of the French idiom.`;
};

const generateAIImageUrl = async (collectionName: string, theme: string, seed: number, proverbText?: string): Promise<string> => {
  const prompt = buildImagePrompt(collectionName, theme, proverbText);

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

  const generated: any[] = await generateAICaptions(collectionName, normalizedTheme, toGenerate);
  console.log(`[AI] generateAICaptions returned ${Array.isArray(generated) ? generated.length : 0} items for theme="${normalizedTheme}"`);
  if (Array.isArray(generated) && generated.length > 0) {
    console.log('[AI] Generated titles:', generated.map((g: any) => String(g.title || '').slice(0, 120)));
  }

  const documents = await Promise.all(
    generated.map(async (item: any, index: number) => {
      const resolvedTitle = await resolveAIImageTitle(collectionName, normalizedTheme, item.title);
      const doc: any = {
        url: await generateAIImageUrl(collectionName, normalizedTheme, Date.now() + index, collectionName === 'images_proverbs' ? item.proverbText : undefined),
        title: resolvedTitle || normalizeText(item.title),
        description: item.description,
        theme: normalizedTheme,
        source: 'ai',
        createdAt: new Date(),
      };
      // For proverbs: save the French proverb text alongside the Portuguese meaning
      if (collectionName === 'images_proverbs' && item.proverbText) {
        doc.proverbText = String(item.proverbText).trim();
      }
      return doc;
    }),
  );

  console.log(`[AI] Prepared ${Array.isArray(documents) ? documents.length : 0} documents to insert for theme="${normalizedTheme}"`);

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

    console.log(`[AI] Inserted ${insertedDocuments.length} new AI documents for theme="${normalizedTheme}"`);
    if (insertedDocuments.length > 0) {
      console.log('[AI] Inserted document titles:', insertedDocuments.map(d => String(d.title).slice(0, 120)));
    }

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