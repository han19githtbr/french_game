import { getDb } from './mongodb';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const DAILY_AI_GENERATION_LIMIT = Number(process.env.AI_DAILY_GENERATION_LIMIT || '4');

const normalizeTheme = (theme: string) => theme.toLowerCase();

const buildPrompt = (collectionName: string, theme: string, count: number) => {
  const normalizedTheme = normalizeTheme(theme);
  const themeDescription = collectionName === 'images_proverbs'
    ? `provérbios franceses do grupo ${normalizedTheme.replace('grupo-', '')}`
    : `o tema ${normalizedTheme}`;

  if (collectionName === 'images') {
    return `Você é um assistente que gera apenas JSON. Crie ${count} legendas curtas em francês para imagens de vocabulário de ${themeDescription}. Responda somente com um array JSON no formato [{"title":"..."}, ...]. Cada título deve ser simples, correto e apropriado para um jogo de correspondência de imagem.`;
  }

  if (collectionName === 'images_sentences') {
    return `Você é um assistente que gera apenas JSON. Crie ${count} frases simples em francês que descrevem cenas ou objetos relacionados a ${themeDescription}. Responda somente com um array JSON no formato [{"title":"..."}, ...]. Cada frase deve ser clara, curta e apropriada para um jogo de imagens.`;
  }

  return `Você é um assistente que gera apenas JSON. Crie ${count} explicações ou legendas em português para provérbios ou expressões francesas relacionadas a ${themeDescription}. Responda somente com um array JSON no formato [{"title":"..."}, ...]. Cada item deve ser uma frase natural em português.`;
};

const buildPlaceholderUrl = (theme: string, seed: number) => {
  const safeTheme = encodeURIComponent(theme.replace(/\s+/g, '-'));
  return `https://loremflickr.com/640/480/${safeTheme}?lock=${seed}`;
};

const parseJsonResponse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    const sanitized = text
      .replace(/\n/g, '')
      .replace(/\s+\[/, '[')
      .replace(/\]\s+$/, ']');
    return JSON.parse(sanitized);
  }
};

const generateAICaptions = async (collectionName: string, theme: string, count: number) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada.');
  }

  const prompt = buildPrompt(collectionName, theme, count);
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

  return parsed.map((item: any) => ({
    title: String(item.title || item.text || item.caption || '').trim(),
  })).filter((item: any) => item.title);
};

export async function ensureDailyAIItems(collectionName: string, theme: string) {
  const normalizedTheme = normalizeTheme(theme);
  const db = await getDb();
  const collection = db.collection(collectionName);

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
  const documents = generated.map((item, index) => ({
    url: buildPlaceholderUrl(normalizedTheme, Date.now() + index),
    title: item.title,
    theme: normalizedTheme,
    source: 'ai',
    createdAt: new Date(),
  }));

  if (documents.length > 0) {
    await collection.insertMany(documents);
  }
}
