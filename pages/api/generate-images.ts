import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb'
import { ensureDailyAIItems, isInvalidCaptionTitle } from '../../lib/ai'

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
    const validThemeImages = themeImages.filter(img => img.title && !isInvalidCaptionTitle(img.title))

    if (!validThemeImages || validThemeImages.length < 1) {
      return res.status(400).json({ error: 'Tema inválido ou sem títulos válidos disponíveis.' })
    }

    const safeCount = Math.min(Number(count) || 4, validThemeImages.length)
    const validTitles = Array.from(new Set(validThemeImages.map(img => img.title)))
    const safeOptionsCount = Math.min(Math.max(Number(optionsCount) || 4, 2), validTitles.length)
    const selectedImages = shuffle(validThemeImages).slice(0, safeCount)
    const allTitles = validTitles

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
