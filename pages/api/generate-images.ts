import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const allImages = {
  'família': [
    { url: '/ghibli/familia/família.png', title: 'Famille' },
    { url: '/ghibli/familia/casa.png', title: 'Maison' },
    { url: '/ghibli/familia/sopa.png', title: 'Soupe' },
    { url: '/ghibli/familia/almoço.png', title: 'Dîner' },
  ],
  'natureza': [
    { url: '/ghibli/natureza/árvore.png', title: 'Arbre' },
    { url: '/ghibli/natureza/floresta.png', title: 'Forêt' },
    { url: '/ghibli/natureza/mar.png', title: 'Mer' },
    { url: '/ghibli/natureza/deserto.png', title: 'Désert' },
    { url: '/ghibli/natureza/montanha.png', title: 'Montagne' },
  ],
  'turismo': [
    { url: '/ghibli/turismo/aeroporto.png', title: 'Aéroport' },
    { url: '/ghibli/turismo/por do sol.png', title: 'Coucher du soleil' },
    { url: '/ghibli/turismo/aviao.png', title: 'Avion' },
    { url: '/ghibli/turismo/helicoptero.png', title: 'Hélicoptère' },
  ],
  'animais': [
    { url: '/ghibli/animais/cachorro.png', title: 'Chien' },
    { url: '/ghibli/animais/gato.png', title: 'Chat' },
    { url: '/ghibli/animais/elefante.png', title: 'Eléphant' },
    { url: '/ghibli/animais/peixe.png', title: 'Poisson' },
    { url: '/ghibli/animais/cobra.png', title: 'Serpent' },
    { url: '/ghibli/animais/urso.png', title: 'Ours' },
    { url: '/ghibli/animais/leao.png', title: 'Lion' },
  ],
  'tecnologia': [
    { url: '/ghibli/tecnologia/satelite.png', title: 'Satellite' },
    { url: '/ghibli/tecnologia/celular.png', title: 'Téléphone' },
    { url: '/ghibli/tecnologia/carro.png', title: 'Voiture' },
  ],
  'gastronomia': [
    { url: '/ghibli/gastronomia/bolo.png', title: 'Gâteau' },
    { url: '/ghibli/gastronomia/legumes.png', title: 'Légumes' },
    { url: '/ghibli/gastronomia/arroz.png', title: 'Riz' },
    { url: '/ghibli/gastronomia/pimenta.png', title: 'Piment' },
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