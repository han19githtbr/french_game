import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb';

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const randomOptions = (correct: string, pool: string[], optionsCount: number) => {
  const others = pool.filter(t => t !== correct);
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, optionsCount - 1))]);
};

// Busca ditados populares em francês via Claude com web_search
async function fetchProverbsFromAI(count: number, group: string): Promise<Array<{ proverbText: string; meaning: string; explanation: string }>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const groupLabel = group === 'grupo-1' ? 'animais, natureza e vida cotidiana'
    : group === 'grupo-2' ? 'amor, família e relações humanas'
    : 'trabalho, sabedoria e filosofia';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Pesquise e liste ${count} ditados populares franceses autênticos sobre o tema: ${groupLabel}.

Para cada ditado, retorne SOMENTE um array JSON válido com este formato (sem markdown, sem texto extra):
[
  {
    "proverbText": "Le texte du dicton en français",
    "meaning": "Significado curto em português (máx 8 palavras)",
    "explanation": "Explicação do significado em português (1-2 frases)"
  }
]

Os ditados devem ser variados, autênticos e bem conhecidos na cultura francesa. Responda SOMENTE com o array JSON.`
        }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) return [];
    const data = await resp.json();

    // Extrai o texto da resposta (pode vir após tool_use)
    const textBlock = (data.content || []).find((b: any) => b.type === 'text');
    if (!textBlock) return [];

    const raw = textBlock.text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((p: any) => p.proverbText && p.meaning && p.explanation)
      .map((p: any) => ({
        proverbText: String(p.proverbText).trim(),
        meaning: String(p.meaning).trim(),
        explanation: String(p.explanation).trim(),
      }));
  } catch (err) {
    console.warn('[proverbs] fetchProverbsFromAI failed:', err);
    return [];
  }
}

// Fallback: busca do banco de dados (images_proverbs)
async function fetchProverbsFromDB(group: string, count: number): Promise<Array<{ proverbText: string; meaning: string; explanation: string }>> {
  try {
    const db = await getDb();
    const collection = db.collection('images_proverbs');
    const items = await collection
      .find({ theme: group.toLowerCase(), proverbText: { $exists: true, $ne: '' } })
      .toArray();

    const valid = items.filter((i: any) => i.proverbText && i.title);
    const selected = shuffle(valid).slice(0, count);

    return selected.map((i: any) => ({
      proverbText: i.proverbText as string,
      meaning: i.title as string,
      explanation: i.description || '',
    }));
  } catch {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { theme, count = 4, optionsCount = 4 } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'Tema não fornecido.' });
  }

  try {
    const safeCount = Math.min(Math.max(Number(count) || 4, 2), 6);
    const safeOptionsCount = Math.min(Math.max(Number(optionsCount) || 4, 2), 6);

    // Tenta buscar ditados via IA (web search)
    let proverbs = await fetchProverbsFromAI(safeCount + 4, theme);

    // Fallback: banco de dados
    if (proverbs.length < safeCount) {
      const dbProverbs = await fetchProverbsFromDB(theme, safeCount);
      // Mescla e deduplica
      const allTexts = new Set(proverbs.map(p => p.proverbText.toLowerCase()));
      for (const dp of dbProverbs) {
        if (!allTexts.has(dp.proverbText.toLowerCase())) {
          proverbs.push(dp);
          allTexts.add(dp.proverbText.toLowerCase());
        }
      }
    }

    if (proverbs.length === 0) {
      return res.status(404).json({ error: 'Não foi possível obter ditados para este grupo.' });
    }

    // Seleciona os ditados para esta rodada
    const selectedProverbs = shuffle(proverbs).slice(0, safeCount);

    // Pool de significados para as opções (todos os ditados buscados)
    const allMeanings = Array.from(new Set(proverbs.map(p => p.meaning)));

    const safePool = allMeanings.length >= safeOptionsCount
      ? allMeanings
      : [...allMeanings, ...shuffle(allMeanings)].slice(0, safeOptionsCount);

    // Monta resposta
    const result = selectedProverbs.map(proverb => ({
      proverbText: proverb.proverbText,
      title: proverb.meaning,           // resposta correta = significado em PT
      explanation: proverb.explanation, // explicação detalhada
      options: randomOptions(proverb.meaning, safePool, safeOptionsCount),
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao buscar provérbios:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar provérbios.' });
  }
}
