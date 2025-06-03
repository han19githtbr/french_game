import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { getDb } from '../../lib/mongodb';


// Embaralhar um array
const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);


const randomOptions = (correct: string, allTitles: string[]) => {
  const otherTitles = allTitles.filter(title => title !== correct)
  const options = shuffle([
    correct,
    ...shuffle(otherTitles).slice(0, 3)
  ])
  return options
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { theme } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'Tema não fornecido' });
  }

  try {
    const db = await getDb();
                
    const collection = db.collection('images_sentences');
    
    const themeImages = await collection.find({ theme: theme.toLowerCase() }).toArray();

    if (!themeImages || themeImages.length < 4) {
      return res.status(400).json({ error: 'Tema inválido ou sem imagens suficientes.' });
    }

    const selectedImages = shuffle(themeImages).slice(0, 4);
    const allTitles = themeImages.map(img => img.title);

    const imagesWithOptions = selectedImages.map(img => ({
      url: img.url,
      title: img.title,
      options: randomOptions(img.title, allTitles),
    }))

    res.status(200).json(imagesWithOptions);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagens.' });
  }
}
