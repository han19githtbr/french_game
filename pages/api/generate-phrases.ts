import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'


const allImages = {
  'família': [
    { url: '/frases/familia/família.png', title: 'Le chef de famille est barbu' },
    { url: '/frases/familia/casa.png', title: 'Quelle jolie maison!' },
    { url: '/frases/familia/sopa.png', title: 'Tu dois manger ta soupe!' },
    { url: '/frases/familia/almoço.png', title: 'La famille se réunit pour dîner!' },
    { url: '/frases/familia/piquenique.png', title: 'Dimanche c\'est le jour d\'une pique-nique en famille' },
    { url: '/frases/familia/mae.png', title: 'Ma soeur est enceinte de six mois' },
    { url: '/frases/familia/casal.jpg', title: 'Le couple se promène main dans la main' },
    { url: '/frases/familia/rir.jpg', title: 'Les trois frères sont heureux' },
    { url: '/frases/familia/natal.png', title: 'La famille se réunit pour ouvrir les cadeaux!' },
    { url: '/frases/familia/plane.png', title: 'La famille est en voyage' },
    { url: '/frases/familia/praia.png', title: 'La famille se promène à la plage' },
    { url: '/frases/familia/teatro.png', title: 'Une famille à la salle de Théâtre' },
    { url: '/frases/familia/tv.png', title: 'La famille se réunit pour regarder la télévision' },
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
    { url: '/frases/natureza/chuva.png', title: 'Il pleut sans arrêt depuis ce matin' },
    { url: '/frases/natureza/dormir.png', title: 'Paul aime dormir au son de la pluie' },
    { url: '/frases/natureza/pescar.png', title: 'Jean aime pêcher durant la journée' },
    { url: '/frases/natureza/rio.png', title: 'Tout près de chez moi, il y a une rivière' },
    { url: '/frases/natureza/estrelas.png', title: 'Le soir, j\'aime regarder les étoiles' },
    { url: '/frases/natureza/mangas.png', title: 'Ce manguier, c\'est celui du voisin' },
    { url: '/frases/natureza/ceu.jpg', title: 'Les trois frères se réunissent sous le ciel bleu' },
    { url: '/frases/natureza/flores.jpg', title: 'Ces fleurs sont très jolies' },
    { url: '/frases/natureza/fotografo.jpg', title: 'Un photographe dans la nature' },
    { url: '/frases/natureza/guarda-chuva.jpg', title: 'Elle sort son parapluie pour se protéger de la pluie' },
    { url: '/frases/natureza/guitarra.jpg', title: 'Paul aime jouer à la guitarre' },
    { url: '/frases/natureza/mergulho.jpg', title: 'Qu\'est-ce qu\'il fait sous l\'eau?' },
    { url: '/frases/natureza/noite.jpg', title: 'Cette nuit est très étoilée!' },
    { url: '/frases/natureza/nuvens.jpg', title: 'Le ciel est rempli de nuages' },
    { url: '/frases/natureza/praia.jpg', title: 'Le couple regarde le coucher du soleil à la plage' },
    { url: '/frases/natureza/lua.png', title: 'C\'est la pleine lune, le moment idéal pour une promenade!' },
    { url: '/frases/natureza/vulcao.png', title: 'Ce volcan est en éruption' },
    { url: '/frases/natureza/furacao.png', title: 'Le cyclone est une catastrophe naturelle' },
  ],
  'turismo': [
    { url: '/frases/turismo/aeroporto.png', title: 'Je suis déjà à l\'Aéroport' },
    { url: '/frases/turismo/por do sol.png', title: 'Quel beau coucher de soleil!' },
    { url: '/frases/turismo/aviao.png', title: 'Je connais le pilote de cet avion' },
    { url: '/frases/turismo/helicoptero.png', title: 'Tu as déjà piloté un hélicoptère?' },
    { url: '/frases/turismo/navio.png', title: 'Ce navire, c\'est celui que j\'ai vu hier' },
    { url: '/frases/turismo/ponte.png', title: 'Il y a un enfant sur le pont' },
    { url: '/frases/turismo/cristo.png', title: 'La statue du Christ Rédempteur se trouve au Brésil' },
    { url: '/frases/turismo/bandeira_haitiana.png', title: 'Le drapeau haïtien est un symbole de liberté' },
    { url: '/frases/turismo/estatua_liberdade.png', title: 'La statue de la liberté est connue dans le monde entier' },
    { url: '/frases/turismo/torre_eiffel.png', title: 'La Tour Eiffel se trouve en France' },
    { url: '/frases/turismo/fogos.jpg', title: 'Mon frère n\'aime pas les feux d\'artifice' },
  ],
  'animais': [
    { url: '/frases/animais/cachorro.png', title: 'C\'est mon chien' },
    { url: '/frases/animais/gato.png', title: 'Ce chat, c\'est celui de Julien' },
    { url: '/frases/animais/elefante.png', title: 'Je n\'ai pas peur des éléphants' },
    { url: '/frases/animais/peixe.png', title: 'Le poisson est riche en vitamines' },
    { url: '/frases/animais/cobra.png', title: 'Ce serpent est venimeux' },
    { url: '/frases/animais/urso.png', title: 'L\'Ours est un animal sauvage' },
    { url: '/frases/animais/leao.png', title: 'Le lion est le roi de la jungle' },
    { url: '/frases/animais/cavalo.png', title: 'Ce cheval, c\'est celui de mon frère' },
    { url: '/frases/animais/papagaio.png', title: 'Ce perroquet, c\'est celui de mon voisin' },
    { url: '/frases/animais/passaro.png', title: 'Cet oiseau est très beau' },
    { url: '/frases/animais/tubarao.png', title: 'J\'ai déjà vu un requin' },
    { url: '/frases/animais/crocodilo.png', title: 'Fais attention aux crocodiles!' },
    { url: '/frases/animais/gorila.png', title: 'Ce gorille est très docile' },
    { url: '/frases/animais/ovelha.png', title: 'Ce mouton a perdu sa troupe' },
    { url: '/frases/animais/pato.png', title: 'Ce canard est celui de ma tante!' },
    { url: '/frases/animais/brincar_cachorro.jpg', title: 'Jean joue avec son chien' },
    { url: '/frases/animais/galinha.jpg', title: 'Je me suis réveillé au chant de ce coq!' },
    { url: '/frases/animais/vaca.png', title: 'Cette vache, c\'est celle de Faubert!' },
    { url: '/frases/animais/coelho.png', title: 'J\'aime les lapins.' },
    { url: '/frases/animais/lobo.png', title: 'Le loup est un animal sauvage' },
    { url: '/frases/animais/gafanhoto.png', title: 'Le cri des sauterelles me tranquilise' },
    { url: '/frases/animais/baleia.png', title: 'les baleines sont de grande taille' },
    { url: '/frases/animais/cabrito.png', title: 'Ce cabrit est celui de mon voisin.' },
    { url: '/frases/animais/golfinho.png', title: 'Les dauphins sont parfois dangereux' },
    { url: '/frases/animais/porco.png', title: 'Ce porc est celui de mon oncle' },
  ],
  'tecnologia': [
    { url: '/frases/tecnologia/satelite.png', title: 'Les satellites sont de grandes inventions' },
    { url: '/frases/tecnologia/celular.png', title: 'J\'ai perdu mon téléphone' },
    { url: '/frases/tecnologia/carro.png', title: 'Je viens d\'acheter une voiture' },
    { url: '/frases/tecnologia/cinema.png', title: 'J\'aime aller au cinéma' },
    { url: '/frases/tecnologia/elevador.png', title: 'Je suis dans l\'ascenseur' },
    { url: '/frases/tecnologia/televisao.png', title: 'Le soir, je regarde souvent la télévision' },
    { url: '/frases/tecnologia/drone.png', title: 'Ce drone controle toute la zone' },
    { url: '/frases/tecnologia/foguete.png', title: 'Cette fusée a été lancée l\'année dernière' },
    { url: '/frases/tecnologia/moto.jpg', title: 'Il est dangereux de piloter une moto sous la pluie!' },
    { url: '/frases/tecnologia/ventilador.png', title: 'J\'aime dormir au son du ventilateur' },
    { url: '/frases/tecnologia/trem.png', title: 'Le train arrive très vite' },
    { url: '/frases/tecnologia/redes_sociais.png', title: 'L\'usage excessif des réseaux sociaux n\'est pas recommandé' },
    { url: '/frases/tecnologia/computador.png', title: 'C\'est l\'ordinateur de ma mère'},
    { url: '/frases/tecnologia/radio.png', title: 'J\'aime écouter la radio' },
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
    { url: '/frases/gastronomia/abacate.png', title: 'Cet avocat a l\'air délicieux!' },
    { url: '/frases/gastronomia/peixe_frito.png', title: 'Le poisson frit, c\'est mon plat préféré!' },
    { url: '/frases/gastronomia/salsichas.png', title: 'Marie n\'aime pas les saucisses.' },
    { url: '/frases/gastronomia/lasanha.png', title: 'Les lasagnes me donnent l\'eau à la bouche!' },
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
