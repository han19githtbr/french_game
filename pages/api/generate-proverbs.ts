import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb';
import { ensureDailyAIItems, isInvalidCaptionTitle, resolveAIImageTitle } from '../../lib/ai';
import { resolveAIImageTitleByVision } from '../../lib/ai-image-resolver';

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const randomOptions = (correct: string, pool: string[], optionsCount: number) => {
  const others = pool.filter(t => t !== correct);
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, optionsCount - 1))]);
};

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

    // --- STEP 1: Resolve correct titles for AI images via Vision ---
    const resolvedImages = await Promise.all(
      selectedImages.map(async (img: any) => {
        // If already resolved by a previous request, skip vision
        if (img.source === 'ai' && img.aiTitleResolved === true) {
          return { ...img };
        }

        if (img.source === 'ai' && img.url) {
          const normalizedTheme = theme.toLowerCase();
          const candidate = String(img.description || img.title || '').trim();

          const fallbackTitle = await resolveAIImageTitle('images_proverbs', normalizedTheme, candidate);
          if (fallbackTitle && fallbackTitle !== img.title) {
            collection.updateOne(
              { _id: img._id },
              { $set: { title: fallbackTitle, aiTitleResolved: true } }
            ).catch(() => {});
            return { ...img, title: fallbackTitle, aiTitleResolved: true };
          }

          // For proverbs: use all non-AI titles as candidates
          const nonAiTitles = Array.from(new Set(
            validThemeImages
              .filter((i: any) => i.source !== 'ai' || i.aiTitleResolved === true)
              .map((i: any) => i.title as string)
          ));

          const allTitles = Array.from(new Set(validThemeImages.map((i: any) => i.title as string)));
          const candidatePool = nonAiTitles.length >= 2 ? nonAiTitles : allTitles;

          if (candidatePool.length >= 2) {
            const visionTitle = await resolveAIImageTitleByVision(img.url, candidatePool, 'images_proverbs');
            if (visionTitle) {
              collection.updateOne(
                { _id: img._id },
                { $set: { title: visionTitle, aiTitleResolved: true } }
              ).catch(() => {});
              return { ...img, title: visionTitle, aiTitleResolved: true };
            }
          }
        }

        return { ...img };
      })
    );

    // --- STEP 2: Build options pool including just-resolved titles ---
    const stableImages = resolvedImages
      .filter((img: any) => !(img.source === 'ai' && img.url && img.aiTitleResolved !== true));
    const finalImages = stableImages.length >= safeCount
      ? stableImages.slice(0, safeCount)
      : resolvedImages.slice(0, safeCount);

    const allValidTitles = Array.from(new Set(finalImages.map((img: any) => img.title as string)));
    const resolvedAiTitles = finalImages
      .filter((img: any) => img.source === 'ai' && img.aiTitleResolved)
      .map((img: any) => img.title as string);

    const mergedTitles = Array.from(new Set([...allValidTitles, ...resolvedAiTitles]));
    const safeOptionsCount = Math.min(Math.max(optionsCount, 2), mergedTitles.length);

    // --- STEP 3: Build final response ---
    const imagesWithOptions = finalImages.map((img: any) => ({
      url: img.url,
      title: img.title,
      description: img.description || '',
      aiGenerated: img.source === 'ai',
      validated: img.validated,
      options: randomOptions(img.title as string, mergedTitles, safeOptionsCount),
    }));

    res.status(200).json(imagesWithOptions);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagens.' });
  }
}
