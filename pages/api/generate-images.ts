import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb'
import { ensureDailyAIItems } from '../../lib/ai'

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5)

const randomOptions = (correct: string, allTitles: string[], optionsCount: number) => {
  const otherTitles = allTitles.filter(title => title !== correct)
  return shuffle([correct, ...shuffle(otherTitles).slice(0, Math.max(0, optionsCount - 1))])
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  const { theme, count = 4, optionsCount = 4 } = req.body

  if (!theme || typeof theme !== 'string') {
    return res.status(400).json({ error: 'Tema nao fornecido.' })
  }

  try {
    const db = await getDb()
    const collection = db.collection('images')
    const normalizedTheme = theme.toLowerCase()

    try {
      await ensureDailyAIItems('images', normalizedTheme)
    } catch (aiError) {
      console.warn('Nao foi possivel gerar imagens via AI:', aiError)
    }

    const themeImages = await collection.find({ theme: normalizedTheme }).toArray()

    if (!themeImages || themeImages.length < 4) {
      return res.status(400).json({ error: 'Tema invalido ou sem imagens suficientes.' })
    }

    const safeCount = Math.min(Number(count) || 4, themeImages.length)
    const safeOptionsCount = Math.min(Math.max(Number(optionsCount) || 4, 2), themeImages.length)
    const selectedImages = shuffle(themeImages).slice(0, safeCount)
    const allTitles = themeImages.map(img => img.title)

    const imagesWithOptions = selectedImages.map(img => ({
      url: img.url,
      title: img.title,
      description: img.description || '',
      aiGenerated: img.source === 'ai',
      options: randomOptions(img.title, allTitles, safeOptionsCount),
    }))

    return res.status(200).json(imagesWithOptions)
  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    return res.status(500).json({ error: 'Erro interno ao buscar imagens.' })
  }
}
