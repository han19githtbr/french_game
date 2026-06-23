import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb';
import { ensureDailyAIItems, isInvalidCaptionTitle, resolveAIImageTitle } from '../../lib/ai';
import { resolveAIImageTitleByVision } from '../../lib/ai-image-resolver';

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const randomOptions = (correct: string, pool: string[], optionsCount: number) => {
  const others = pool.filter(t => t !== correct);
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, optionsCount - 1))]);
};

/**
 * Para imagens AI de provérbios, gera o ditado em francês e seu significado em português
 * chamando Claude com a imagem.
 * Retorna { proverbText: string (ditado em fr), meaning: string (significado em pt) } ou null.
 */
async function resolveProverbByVision(
  imageUrl: string,
  portugueseMeanings: string[],
): Promise<{ proverbText: string | null; meaning: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { proverbText: null, meaning: null };

  try {
    const imageResp = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) });
    if (!imageResp.ok) return { proverbText: null, meaning: null };
    const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
    const rawType = contentType.split(';')[0].trim();
    const mediaType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawType)
      ? rawType : 'image/jpeg';
    const buffer = await imageResp.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) return { proverbText: null, meaning: null };
    const base64 = Buffer.from(buffer).toString('base64');

    // Step 1: Identify which meaning from the list best matches the image
    const meaningList = portugueseMeanings.map((m, i) => `${i + 1}. ${m}`).join('\n');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: `This image illustrates a French proverb or idiomatic expression. 

Here is a list of Portuguese meanings of French proverbs:
${meaningList}

Reply ONLY with a JSON object in this format:
{"meaningIndex": <number from 1 to ${portugueseMeanings.length}>, "frenchProverb": "<the French proverb or expression that this image illustrates, in French>"}

Choose the meaning that best matches what this image symbolically represents. Also provide the French proverb text.`
            }
          ]
        }]
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) return { proverbText: null, meaning: null };
    const data = await resp.json();
    const raw = (data.content?.[0]?.text || '').trim();

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const idx = Number(parsed.meaningIndex) - 1;
        const meaning = portugueseMeanings[idx] || null;
        const frenchProverb = typeof parsed.frenchProverb === 'string' ? parsed.frenchProverb.trim() : null;
        return { proverbText: frenchProverb, meaning };
      }
    } catch {
      // fallback: try to find the meaning by text
    }

    return { proverbText: null, meaning: null };
  } catch (err) {
    console.warn('[proverbs] resolveProverbByVision failed:', err);
    return { proverbText: null, meaning: null };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { theme, count = 6, optionsCount = 4 } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'Tema não fornecido.' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('images_proverbs');

    try {
      await ensureDailyAIItems('images_proverbs', theme);
    } catch (aiError) {
      console.warn('Não foi possível gerar provérbios via AI:', aiError);
    }

    // Busca TODOS os itens do tema
    const themeImages = await collection.find({ theme: theme.toLowerCase() }).toArray();

    const validThemeImages = themeImages.filter((img: any) =>
      img.title &&
      !isInvalidCaptionTitle(img.title) &&
      img.validated !== false
    );

    if (!validThemeImages || validThemeImages.length < 1) {
      return res.status(400).json({ error: 'Tema inválido ou sem títulos válidos disponíveis.' });
    }

    const safeCount = Math.min(count, validThemeImages.length);
    const initialSelectionCount = Math.min(validThemeImages.length, safeCount * 3);
    const selectedImages = shuffle(validThemeImages).slice(0, initialSelectionCount);

    // Pool de significados em português (todos os títulos não-AI do banco)
    // Em proverbs, title = significado em português
    const allPortugueseMeanings = Array.from(new Set(
      validThemeImages
        .filter((i: any) => i.source !== 'ai' || i.aiTitleResolved === true)
        .map((i: any) => i.title as string)
        .filter(Boolean)
    ));

    // --- STEP 1: Resolve correct titles for AI images ---
    const resolvedImages = await Promise.all(
      selectedImages.map(async (img: any) => {
        // Already resolved
        if (img.source === 'ai' && img.aiTitleResolved === true) {
          return { ...img };
        }

        if (img.source === 'ai' && img.url) {
          const normalizedTheme = theme.toLowerCase();

          // Step A: Try DB matching on description/title
          const candidate = String(img.description || img.title || '').trim();
          const fallbackTitle = await resolveAIImageTitle('images_proverbs', normalizedTheme, candidate);
          if (fallbackTitle && fallbackTitle !== img.title && !isInvalidCaptionTitle(fallbackTitle)) {
            collection.updateOne(
              { _id: img._id },
              { $set: { title: fallbackTitle, aiTitleResolved: true } }
            ).catch(() => {});
            return { ...img, title: fallbackTitle, aiTitleResolved: true };
          }

          // Step B: Vision - match against all Portuguese meanings
          if (allPortugueseMeanings.length >= 2) {
            const visionTitle = await resolveAIImageTitleByVision(img.url, allPortugueseMeanings, 'images_proverbs');
            if (visionTitle && !isInvalidCaptionTitle(visionTitle)) {
              collection.updateOne(
                { _id: img._id },
                { $set: { title: visionTitle, aiTitleResolved: true } }
              ).catch(() => {});
              return { ...img, title: visionTitle, aiTitleResolved: true };
            }
          }

          // Step C: Full Vision analysis - get both the French proverb text and Portuguese meaning
          const { proverbText, meaning } = await resolveProverbByVision(img.url, allPortugueseMeanings);

          if (meaning && !isInvalidCaptionTitle(meaning)) {
            const updateData: any = { title: meaning, aiTitleResolved: true };
            if (proverbText) updateData.proverbText = proverbText;
            collection.updateOne({ _id: img._id }, { $set: updateData }).catch(() => {});
            return { ...img, title: meaning, proverbText: proverbText || img.proverbText, aiTitleResolved: true };
          }

          // Skip unresolved AI images with invalid titles
          if (!isInvalidCaptionTitle(img.title)) {
            return { ...img };
          }
          return { ...img, _skipUnresolved: true };
        }

        return { ...img };
      })
    );

    // --- STEP 2: Filter out unresolved ---
    const cleanResolved = resolvedImages.filter((img: any) => !img._skipUnresolved);

    const stableImages = cleanResolved
      .filter((img: any) => !(img.source === 'ai' && img.url && img.aiTitleResolved !== true));
    const finalImages = stableImages.length >= safeCount
      ? stableImages.slice(0, safeCount)
      : cleanResolved.slice(0, safeCount);

    // --- STEP 3: Build options pool (all Portuguese meanings from the entire theme) ---
    const resolvedAiMeanings = cleanResolved
      .filter((img: any) => img.source === 'ai' && img.aiTitleResolved)
      .map((img: any) => img.title as string);

    // Base pool: all non-AI Portuguese meanings + resolved AI meanings
    const allNonAiMeanings = Array.from(new Set(
      validThemeImages
        .filter((i: any) => i.source !== 'ai')
        .map((i: any) => i.title as string)
        .filter(Boolean)
    ));

    const mergedMeanings = Array.from(new Set([...allNonAiMeanings, ...resolvedAiMeanings]));
    const safeOptionsCount = Math.min(Math.max(optionsCount, 2), mergedMeanings.length);

    // --- STEP 4: Build final response ---
    // For proverbs: title = Portuguese meaning (the answer)
    // proverbText = French proverb text (displayed in card header/image)
    // description = context description shown below image
    const imagesWithOptions = finalImages.map((img: any) => ({
      url: img.url,
      title: img.title,                           // Portuguese meaning = correct answer
      proverbText: img.proverbText || null,        // French proverb text (for display in card)
      description: img.description || '',
      aiGenerated: img.source === 'ai',
      validated: img.validated,
      options: randomOptions(img.title as string, mergedMeanings, safeOptionsCount),
    }));

    res.status(200).json(imagesWithOptions);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagens.' });
  }
}
