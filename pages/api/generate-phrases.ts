import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb';
import { ensureDailyAIItems, isInvalidCaptionTitle } from '../../lib/ai';

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const randomOptions = (correct: string, allTitles: string[], optionsCount: number) => {
  const otherTitles = allTitles.filter(title => title !== correct);
  return shuffle([correct, ...shuffle(otherTitles).slice(0, Math.max(0, optionsCount - 1))]);
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

    const themeImages = await collection.find({ theme: theme.toLowerCase() }).toArray();

    // Filtra imagens: exclui títulos inválidos E imagens marcadas explicitamente como inválidas
    const validThemeImages = themeImages.filter((img: any) =>
      img.title &&
      !isInvalidCaptionTitle(img.title) &&
      img.validated !== false
    );

    if (!validThemeImages || validThemeImages.length < 1) {
      return res.status(400).json({ error: 'Tema inválido ou sem títulos válidos disponíveis.' });
    }

    const validTitles = Array.from(new Set(validThemeImages.map((img: any) => img.title)));
    const safeCount = Math.min(count, validThemeImages.length);
    const safeOptionsCount = Math.min(Math.max(optionsCount, 2), validTitles.length);
    const selectedImages = shuffle(validThemeImages).slice(0, safeCount);

    const imagesWithOptions = selectedImages.map(img => ({
      url: img.url,
      title: img.title,
      description: img.description || '',
      aiGenerated: img.source === 'ai',
      validated: img.validated,
      options: randomOptions(img.title, validTitles as string[], safeOptionsCount),
    }))

    res.status(200).json(imagesWithOptions);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagens.' });
  }
}
