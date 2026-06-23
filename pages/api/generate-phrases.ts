import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb';
import { ensureDailyAIItems, isInvalidCaptionTitle, resolveAIImageTitle } from '../../lib/ai';
import { filterSentenceTitles, resolveAIImageTitleByVision } from '../../lib/ai-image-resolver';

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const randomOptions = (correct: string, pool: string[], optionsCount: number) => {
  const others = pool.filter(t => t !== correct);
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, optionsCount - 1))]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { theme, count = 6, optionsCount = 4 } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'Tema não fornecido' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('images_sentences');

    try {
      await ensureDailyAIItems('images_sentences', theme);
    } catch (aiError) {
      console.warn('Não foi possível gerar frases via AI:', aiError);
    }

    // Busca TODOS os itens do tema para pool completo
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
        if (img.source === 'ai' && img.aiTitleResolved === true) {
          return { ...img };
        }

        if (img.source === 'ai' && img.url) {
          const normalizedTheme = theme.toLowerCase();
          const candidate = String(img.description || img.title || '').trim();

          // Step A: DB matching
          const fallbackTitle = await resolveAIImageTitle('images_sentences', normalizedTheme, candidate);
          if (fallbackTitle && fallbackTitle !== img.title && !isInvalidCaptionTitle(fallbackTitle)) {
            collection.updateOne(
              { _id: img._id },
              { $set: { title: fallbackTitle, aiTitleResolved: true } }
            ).catch(() => {});
            return { ...img, title: fallbackTitle, aiTitleResolved: true };
          }

          // Step B: Vision - use ALL non-AI sentence titles as candidates
          const allNonAiSentenceTitles = filterSentenceTitles(
            Array.from(new Set(
              validThemeImages
                .filter((i: any) => i.source !== 'ai' || i.aiTitleResolved === true)
                .map((i: any) => i.title as string)
            ))
          );

          const allSentenceTitles = filterSentenceTitles(
            Array.from(new Set(validThemeImages.map((i: any) => i.title as string)))
          );
          const candidatePool = allNonAiSentenceTitles.length >= 2 ? allNonAiSentenceTitles : allSentenceTitles;

          if (candidatePool.length >= 2) {
            const visionTitle = await resolveAIImageTitleByVision(img.url, candidatePool, 'images_sentences');
            if (visionTitle && !isInvalidCaptionTitle(visionTitle)) {
              collection.updateOne(
                { _id: img._id },
                { $set: { title: visionTitle, aiTitleResolved: true } }
              ).catch(() => {});
              return { ...img, title: visionTitle, aiTitleResolved: true };
            }
          }

          // Step C: Generate a NEW correct sentence via AI Vision (open-ended) when no match found
          // Ask Claude to describe the image in French as a sentence
          if (process.env.ANTHROPIC_API_KEY) {
            try {
              const imageResp = await fetch(img.url, { signal: AbortSignal.timeout(10000) });
              if (imageResp.ok) {
                const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
                const rawType = contentType.split(';')[0].trim();
                const mediaType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawType)
                  ? rawType : 'image/jpeg';
                const buffer = await imageResp.arrayBuffer();
                if (buffer.byteLength <= 5 * 1024 * 1024) {
                  const base64 = Buffer.from(buffer).toString('base64');
                  const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'x-api-key': process.env.ANTHROPIC_API_KEY,
                      'anthropic-version': '2023-06-01',
                      'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                      model: 'claude-haiku-4-5-20251001',
                      max_tokens: 100,
                      messages: [{
                        role: 'user',
                        content: [
                          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                          { type: 'text', text: `Describe this image in a single natural French sentence (6-12 words) related to the theme "${normalizedTheme}". Reply ONLY with the sentence, nothing else.` }
                        ]
                      }]
                    }),
                    signal: AbortSignal.timeout(20000),
                  });

                  if (claudeResp.ok) {
                    const claudeData = await claudeResp.json();
                    const generatedSentence = (claudeData.content?.[0]?.text || '').trim();
                    if (generatedSentence && generatedSentence.length > 5) {
                      // Save this new sentence as the correct title
                      collection.updateOne(
                        { _id: img._id },
                        { $set: { title: generatedSentence, aiTitleResolved: true } }
                      ).catch(() => {});
                      return { ...img, title: generatedSentence, aiTitleResolved: true };
                    }
                  }
                }
              }
            } catch (err) {
              console.warn('[frases] Vision sentence generation failed:', err);
            }
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

    // --- STEP 2: Filter out unresolved AI images ---
    const cleanResolved = resolvedImages.filter((img: any) => !img._skipUnresolved);

    const stableImages = cleanResolved
      .filter((img: any) => !(img.source === 'ai' && img.url && img.aiTitleResolved !== true));
    const finalImages = stableImages.length >= safeCount
      ? stableImages.slice(0, safeCount)
      : cleanResolved.slice(0, safeCount);

    // --- STEP 3: Build a rich options pool ---
    const resolvedAiTitles = cleanResolved
      .filter((img: any) => img.source === 'ai' && img.aiTitleResolved)
      .map((img: any) => img.title as string);

    // Use ALL non-AI sentence titles as the base pool
    const allNonAiSentenceTitles = filterSentenceTitles(
      Array.from(new Set(
        validThemeImages
          .filter((i: any) => i.source !== 'ai')
          .map((i: any) => i.title as string)
      ))
    );

    const mergedTitles = Array.from(new Set([...allNonAiSentenceTitles, ...resolvedAiTitles]));
    const sentenceTitles = filterSentenceTitles(mergedTitles);
    const validTitles = sentenceTitles.length >= 2 ? sentenceTitles : mergedTitles;

    const safeOptionsCount = Math.min(Math.max(optionsCount, 2), validTitles.length);

    // --- STEP 4: Build final response ---
    const imagesWithOptions = finalImages.map((img: any) => ({
      url: img.url,
      title: img.title,
      description: img.description || '',
      aiGenerated: img.source === 'ai',
      validated: img.validated,
      options: randomOptions(img.title as string, validTitles, safeOptionsCount),
    }));

    res.status(200).json(imagesWithOptions);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagens.' });
  }
}