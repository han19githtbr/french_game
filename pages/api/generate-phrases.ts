import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const allImages = {
  'família': [
    { url: '/frases/familia/família.png', title: 'La famille est réunie' },
    { url: '/frases/familia/casa.png', title: 'Quelle jolie maison!' },
    { url: '/frases/familia/sopa.png', title: 'Tu dois manger ta soupe!' },
    { url: '/frases/familia/almoço.png', title: 'La famille se réunit pour dîner!' },
    { url: '/frases/familia/piquenique.png', title: 'Dimanche c\'est le jour d\'une pique-nique en famille' },
  ],
  'natureza': [
    { url: '/frases/natureza/árvore.png', title: 'Il y a quelqu\'un sous l\'arbre' },
    { url: '/frases/natureza/floresta.png', title: 'En route vers la forêt!' },
    { url: '/frases/natureza/mar.png', title: 'La mer est calme aujourd\'hui' },
    { url: '/frases/natureza/deserto.png', title: 'Une journée dans le désert' },
    { url: '/frases/natureza/montanha.png', title: 'Devant nous se dresse une haute montagne' },
    { url: '/frases/natureza/deserto.png', title: 'Une journée dans le désert' },
    { url: '/frases/natureza/pescar.png', title: 'Jean aime pêcher durant la journée' },
    { url: '/frases/natureza/rio.png', title: 'Tout près de chez moi, il y a une rivière' },
  ],
  'turismo': [
    { url: '/frases/turismo/aeroporto.png', title: 'Je suis déjà à l\'Aéroport' },
    { url: '/frases/turismo/por do sol.png', title: 'Quel beau coucher de soleil!' },
    { url: '/frases/turismo/aviao.png', title: 'Je connais le pilote de cet avion' },
    { url: '/frases/turismo/helicoptero.png', title: 'Tu as déjà piloté un hélicoptère?' },
    { url: '/frases/turismo/navio.png', title: 'Ce navire, c\'est celui que j\'ai vu hier' },
    { url: '/frases/turismo/ponte.png', title: 'Il y a un enfant sur le pont' },
  ],
  'animais': [
    { url: '/frases/animais/cachorro.png', title: 'C\'est mon chien' },
    { url: '/frases/animais/gato.png', title: 'Ce chat, c\'est celui de Julien' },
    { url: '/frases/animais/elefante.png', title: 'Je n\'ai pas peur des eléphants' },
    { url: '/frases/animais/peixe.png', title: 'Le poisson est riche en vitamines' },
    { url: '/frases/animais/cobra.png', title: 'Ce serpent est venimeux' },
    { url: '/frases/animais/urso.png', title: 'L\'Ours est un animal sauvage' },
    { url: '/frases/animais/leao.png', title: 'Le lion est le roi de la jungle' },
    { url: '/frases/animais/cavalo.png', title: 'Ce cheval, c\'est celui de mon frère' },
    { url: '/frases/animais/papagaio.png', title: 'Ce perroquet, c\'est celui de mon voisin' },
    { url: '/frases/animais/passaro.png', title: 'Cet oiseau est très beau' },
    { url: '/frases/animais/tubarao.png', title: 'J\'ai déjà vu un requin' },
  ],
  'tecnologia': [
    { url: '/frases/tecnologia/satelite.png', title: 'Les satellites sont de grandes inventions' },
    { url: '/frases/tecnologia/celular.png', title: 'J\'ai perdu mon téléphone' },
    { url: '/frases/tecnologia/carro.png', title: 'Je viens d\'acheter une voiture' },
    { url: '/frases/tecnologia/cinema.png', title: 'J\'aime aller au cinéma' },
    { url: '/frases/tecnologia/elevador.png', title: 'Je suis dans l\'ascenseur' },
    { url: '/frases/tecnologia/televisao.png', title: 'Le soir, je regarde souvent la télévision' },
  ],
  'gastronomia': [
    { url: '/frases/gastronomia/bolo.png', title: 'C\'est l\'heure de couper le gâteau!' },
    { url: '/frases/gastronomia/legumes.png', title: 'Les légumes sont riches en fer' },
    { url: '/frases/gastronomia/arroz.png', title: 'Je vais déguster un plat de riz!' },
    { url: '/frases/gastronomia/pimenta.png', title: 'Il faut consomner le piment avec modération!' },
    { url: '/frases/gastronomia/cozinheira.png', title: 'La cuisinière prépare un bon plat' },
    { url: '/frases/gastronomia/frango.png', title: 'Ce poulet me donne l\'eau à la bouche' },
    { url: '/frases/gastronomia/ovos_fritos.png', title: 'Des oeufs frits pour le petit déjeuner' },
    { url: '/frases/gastronomia/salada.png', title: 'Il est recommendé de manger des salades' },
    { url: '/frases/gastronomia/suco.png', title: 'J\'aime boire du jus d\'orange' },
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