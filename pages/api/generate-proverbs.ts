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
  const { theme } = req.body
  
  if (!theme) {
    return res.status(400).json({ error: 'O tema é obrigatório.' });
  }

  try {
    const client = await connectDB();
    const db: Db = client.db();

    const themeImages = await db
      .collection<ImageData>('french_proverbs')
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
    }));

    res.status(200).json(imagesWithOptions);
  } catch (e) {
    console.error('Erro ao conectar ao MongoDB ou buscar imagens:', e);
    res.status(500).json({ error: 'Erro interno ao buscar as imagens.' });
  }

}


/*const allImages = {
  'grupo-1': [
    { url: '/proverbios/grupo-1/courage.jpg', title: 'Réunir as suas forças' },
    { url: '/proverbios/grupo-1/a_cheval.jpg', title: 'Levar algo muito a sério' },
    { url: '/proverbios/grupo-1/belle_jambe.jpg', title: 'Eu não me importo' },
    { url: '/proverbios/grupo-1/coup_de_barre.jpg', title: 'Estar muito cansado' },
    { url: '/proverbios/grupo-1/coup_de_main.jpg', title: 'Ajudar alguém' },
    { url: '/proverbios/grupo-1/coup_de_vieux.jpg', title: 'Envelhecer rapidamente' },
    { url: '/proverbios/grupo-1/dans_le_bain.jpg', title: 'Se acostumar com algo novo' },
    { url: '/proverbios/grupo-1/epingles.jpg', title: 'Chique, estar muito bem vestido' },
    { url: '/proverbios/grupo-1/beaux_draps.jpg', title: 'Estar em uma situação complicada' },
    { url: '/proverbios/grupo-1/gueule_de_bois.jpg', title: 'Estar de ressaca' },
        
  ],
  'grupo-2': [
    { url: '/proverbios/grupo-2/long_feu.jpg', title: 'Durar menos do que o previsto' },
    { url: '/proverbios/grupo-2/louche.jpg', title: 'Aproximadamente' },
    { url: '/proverbios/grupo-2/main_verte.jpg', title: 'Ter talento para a jardinagem' },
    { url: '/proverbios/grupo-2/midi_porte.jpg', title: 'Ver as coisas de acordo com o seu ponto de vista' },
    { url: '/proverbios/grupo-2/moutons.jpg', title: 'Voltar ao assunto principal da conversa' },
    { url: '/proverbios/grupo-2/paquerettes.jpg', title: 'Desinteressante' },
    { url: '/proverbios/grupo-2/peter_cable.jpg', title: 'Ter um surto de raiva' },
    { url: '/proverbios/grupo-2/petite_cuiller.jpg', title: 'Estar muito cansado' },
    { url: '/proverbios/grupo-2/pinceaux.jpg', title: 'Se confundir' },
    { url: '/proverbios/grupo-2/pipeau.jpg', title: 'Não é verdade' },
  ],
  'grupo-3': [
    { url: '/proverbios/grupo-3/poil_main.jpg', title: 'Ser muito preguiçoso' },
    { url: '/proverbios/grupo-3/poireauter.jpg', title: 'Esperar alguém por muito tempo' },
    { url: '/proverbios/grupo-3/pompes.jpg', title: 'Estar ditraído' },
    { url: '/proverbios/grupo-3/poules_dents.jpg', title: 'Jamais' },
    { url: '/proverbios/grupo-3/prunes.jpg', title: 'Sem motivo algum' },
    { url: '/proverbios/grupo-3/salades.jpg', title: 'Contar coisas que não são verdadeiras' },
    { url: '/proverbios/grupo-3/sur_le_pouce.jpg', title: 'Comer rapidamente' },
    { url: '/proverbios/grupo-3/tondu.jpg', title: 'Tem pouca gente' },
    { url: '/proverbios/grupo-3/verre_deau.jpg', title: 'Se deixar ultrapassado por uma pequena dificuldade' },
    { url: '/proverbios/grupo-3/vie_en_rose.jpg', title: 'Estar muito feliz' },
    
  ]
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { theme } = req.body
  
  const lowerGroup = theme?.toLowerCase() as keyof typeof allImages

  if (!lowerGroup || !(lowerGroup in allImages)) {
    return res.status(400).json({ error: 'Grupo inválido ou sem imagens.' })
  }

  const groupImages = allImages[lowerGroup]
  const selectedImages = shuffle(groupImages).slice(0, 4)
  const allTitles = groupImages.map(img => img.title)

  const imagesWithOptions = selectedImages.map(img => ({
    url: img.url,
    title: img.title,
    options: randomOptions(img.title, allTitles),
  }))

  res.status(200).json(imagesWithOptions)
}*/