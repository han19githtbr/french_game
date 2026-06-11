import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb';
import { ensureDailyAIItems, isInvalidCaptionTitle } from '../../lib/ai';


const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const randomOptions = (correct: string, allTitles: string[]) => {
  const otherTitles = allTitles.filter(title => title !== correct);
  const options = shuffle([correct, ...shuffle(otherTitles).slice(0, 3)]);
  return options;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { theme, count = 6 } = req.body;

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
    const validThemeImages = themeImages.filter((img: any) => img.title && !isInvalidCaptionTitle(img.title));

    if (!validThemeImages || validThemeImages.length < 1) {
      return res.status(400).json({ error: 'Tema inválido ou sem títulos válidos disponíveis.' });
    }

    const safeCount = Math.min(count, validThemeImages.length);
    const selectedImages = shuffle(validThemeImages).slice(0, safeCount);
    const validTitles = Array.from(new Set(validThemeImages.map((img: any) => img.title)));
    const allTitles = validTitles;

    const imagesWithOptions = selectedImages.map(img => ({
      url: img.url,
      title: img.title,
      description: img.description || '',
      aiGenerated: img.source === 'ai',
      options: randomOptions(img.title, allTitles),
    }));

    res.status(200).json(imagesWithOptions);

  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagens.' });
  }
}