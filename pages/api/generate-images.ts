import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import connectDB from '../../lib/mongodb'
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
  const { theme } = req.body;
  const startTime = Date.now();
  
  if (!theme) {
    return res.status(400).json({ error: 'O tema é obrigatório.' });
  }

  try {
    const clientPromise = connectDB();
    const connectionTime = Date.now();
    console.log(`Tempo para conectar ao DB: ${connectionTime - startTime}ms`);
    const client = await clientPromise;
    const db: Db = client.db();

    const findStartTime = Date.now();
    const themeImages = await db
      .collection<ImageData>('french_images')
      .find({ theme: theme.toLowerCase() })
      .toArray();

    const findEndTime = Date.now();
    console.log(`Tempo para executar a consulta: ${findEndTime - findStartTime}ms, Resultados: ${themeImages.length}`);
        
    if (!themeImages || themeImages.length === 0) {
      return res.status(404).json({ error: 'Nenhuma imagem encontrada para este tema.' });
    }
  
    const processingStartTime = Date.now();
    const selectedImages = shuffle(themeImages).slice(0, 4);
    const allTitles = themeImages.map(img => img.title);
  
    const imagesWithOptions = selectedImages.map(img => ({
      url: img.url,
      title: img.title,
      options: randomOptions(img.title, allTitles),
    }));
    const processingEndTime = Date.now();
    console.log(`Tempo para processar os resultados: ${processingEndTime - processingStartTime}ms`);


    res.status(200).json(imagesWithOptions);
    const responseEndTime = Date.now();
    console.log(`Tempo total da requisição: ${responseEndTime - startTime}ms`);
  } catch (e) {
    console.error('Erro ao conectar ao MongoDB ou buscar imagens:', e);
    res.status(500).json({ error: 'Erro interno ao buscar as imagens.' });
  }
}

  

  