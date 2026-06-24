import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb'
import { isInvalidCaptionTitle } from '../../lib/ai'
import { filterWordTitles } from '../../lib/ai-image-resolver'

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5)

const randomOptions = (correct: string, pool: string[], optionsCount: number) => {
  const others = pool.filter(t => t !== correct)
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, optionsCount - 1))])
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  // count agora controla quantos CARDS são exibidos (dificuldade)
  const { theme, count = 4, optionsCount = 4 } = req.body

  if (!theme || typeof theme !== 'string') {
    return res.status(400).json({ error: 'Tema nao fornecido.' })
  }

  try {
    const db = await getDb()
    const collection = db.collection('images')
    const normalizedTheme = theme.toLowerCase()

    // Busca TODOS os itens do tema para ter um pool grande de opções
    const themeImages = await collection.find({ theme: normalizedTheme }).toArray()

    const validThemeImages = themeImages.filter(img =>
      img.title &&
      !isInvalidCaptionTitle(img.title) &&
      img.validated !== false &&
      img.url &&
      typeof img.url === 'string' &&
      img.url.trim() !== ''
    )

    if (!validThemeImages || validThemeImages.length < 1) {
      return res.status(400).json({ error: 'Tema inválido ou sem imagens disponíveis.' })
    }

    // count controla quantos cards são exibidos na rodada
    const safeCount = Math.min(Number(count) || 4, validThemeImages.length)
    
    // Nova lógica: para cada título único do tema, pode haver múltiplas imagens.
    // Agrupamos as imagens por título e selecionamos até `safeCount` títulos distintos,
    // priorizando títulos com mais imagens disponíveis (maior variedade para o usuário).
    const imagesByTitle = new Map<string, any[]>()
    for (const img of validThemeImages) {
      const t = img.title as string
      if (!imagesByTitle.has(t)) imagesByTitle.set(t, [])
      imagesByTitle.get(t)!.push(img)
    }

    // Seleciona `safeCount` títulos distintos aleatoriamente
    const distinctTitles = shuffle(Array.from(imagesByTitle.keys()))
    const selectedTitles = distinctTitles.slice(0, safeCount)

    // Para cada título selecionado, escolhe uma imagem aleatória do banco
    const finalImages = selectedTitles.map(title => {
      const imgsForTitle = imagesByTitle.get(title)!
      return imgsForTitle[Math.floor(Math.random() * imgsForTitle.length)]
    })

    // Pool de títulos para as opções (todos os títulos válidos do tema)
    const allValidTitles = filterWordTitles(
      Array.from(new Set(validThemeImages.map(i => i.title as string)))
    )
    const validTitles = allValidTitles.length >= 2 ? allValidTitles : 
      Array.from(new Set(validThemeImages.map(i => i.title as string)))

    const safeOptionsCount = Math.min(Math.max(Number(optionsCount) || 4, 2), validTitles.length)

    // Monta resposta final
    const imagesWithOptions = finalImages.map(img => {
      const imgData = img as any
      return {
        url: imgData.url,
        title: imgData.title,
        description: imgData.description || '',
        aiGenerated: imgData.source === 'ai',
        validated: imgData.validated,
        options: randomOptions(imgData.title as string, validTitles, safeOptionsCount),
      }
    })

    return res.status(200).json(imagesWithOptions)
  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    return res.status(500).json({ error: 'Erro interno ao buscar imagens.' })
  }
}
