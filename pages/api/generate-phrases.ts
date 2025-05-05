import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import connectDB from '../../lib/mongodb';
import { Db } from 'mongodb';


interface ImageData {
  url: string;
  title: string;
  theme: string;
}

// Embaralhar um array
const shuffle = <T>(array: T[]): T[] =>
  [...array].sort(() => Math.random() - 0.5)


const randomOptions = (correct: string, allTitles: string[]) => {
  const otherTitles = allTitles.filter(title => title !== correct)
  const options = shuffle([
    correct,
    ...shuffle(otherTitles).slice(0, 3)
  ])
  return options
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { theme } = req.body
  
  if (!theme) {
    return res.status(400).json({ error: 'O tema é obrigatório.' });
  }

  try {
    const client = await connectDB();
    const db: Db = client.db();

    const themeImages = await db
      .collection<ImageData>('french_images')
      .find({ theme: theme.toLowerCase() })
      .toArray();

    if (!themeImages || themeImages.length === 0) {
      return res.status(404).json({ error: 'Nenhuma imagem encontrada para este tema.' });
    }

    const selectedImages = shuffle(themeImages).slice(0, 4);
    const allTitles = themeImages.map(img => img.title);

    const imagesWithOptions = selectedImages.map(img => ({
      url: img.url,
      title: img.title,
      options: randomOptions(img.title, allTitles),
    }))
  
    res.status(200).json(imagesWithOptions);
  } catch (e) {
    console.error('Erro ao conectar ao MongoDB ou buscar imagens:', e);
    res.status(500).json({ error: 'Erro interno ao buscar as imagens.' });
  }
}



