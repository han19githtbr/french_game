import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const allImages = {
  'família': [
    { url: '/frases/familia/família.png', title: 'La famille est réunie' },
    { url: '/frases/familia/casa.png', title: 'Quelle jolie maison!' },
    { url: '/frases/familia/sopa.png', title: 'Tu dois manger ta soupe!' },
  ],
  'natureza': [
    { url: '/frases/natureza/árvore.png', title: 'Il y a quelqu\'un sous l\'arbre' },
    { url: '/frases/natureza/floresta.png', title: 'En route vers la forêt!' },
    { url: '/frases/natureza/mar.png', title: 'La mer est calme aujourd\'hui' },
  ],
  'turismo': [
    { url: '/frases/turismo/aeroporto.png', title: 'Je suis déjà à l\'Aéroport' },
    { url: '/frases/turismo/por do sol.png', title: 'Quel beau coucher de soleil!' },
    { url: '/frases/turismo/aviao.png', title: 'Je connais le pilote de cet avion' },
  ],
  'animais': [
    { url: '/frases/animais/cachorro.png', title: 'C\'est mon chien' },
    { url: '/frases/animais/gato.png', title: 'Ce chat, c\'est celui de Julien' },
    { url: '/frases/animais/elefante.png', title: 'Je n\'ai pas peur des eléphants' },
    { url: '/frases/animais/peixe.png', title: 'Le poisson est riche en vitamines' },
    { url: '/frases/animais/cobra.png', title: 'Ce serpent est venimeux' },
    { url: '/frases/animais/urso.png', title: 'L\'Ours est un animal sauvage' },
  ],
  'tecnologia': [
    { url: '/frases/tecnologia/satelite.png', title: 'Les satellites sont de grandes inventions' },
    { url: '/frases/tecnologia/celular.png', title: 'J\'ai perdu mon téléphone' },
    { url: '/frases/tecnologia/carro.png', title: 'Je viens d\'acheter une voiture' },
  ],
  'gastronomia': [
    { url: '/frases/gastronomia/bolo.png', title: 'C\'est l\'heure de couper le gâteau!' },
    { url: '/frases/gastronomia/legumes.png', title: 'Les légumes sont riches en fer' },
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
  
  const lowerTheme = theme?.toLowerCase() as keyof typeof allImages

  if (!lowerTheme || !(lowerTheme in allImages)) {
    return res.status(400).json({ error: 'Tema inválido ou sem imagens.' })
  }

  const themeImages = allImages[lowerTheme]
  const selectedImages = shuffle(themeImages).slice(0, 4)
  const allTitles = themeImages.map(img => img.title)

  const imagesWithOptions = selectedImages.map(img => ({
    url: img.url,
    title: img.title,
    options: randomOptions(img.title, allTitles),
  }))

  res.status(200).json(imagesWithOptions)
}