import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongodb'
import { ensureDailyAIItems, isInvalidCaptionTitle, resolveAIImageTitle } from '../../lib/ai'
import { filterWordTitles, resolveAIImageTitleByVision } from '../../lib/ai-image-resolver'

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5)

const randomOptions = (correct: string, pool: string[], optionsCount: number) => {
  const others = pool.filter(t => t !== correct)
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, optionsCount - 1))])
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

    const validThemeImages = themeImages.filter(img =>
      img.title &&
      !isInvalidCaptionTitle(img.title) &&
      img.validated !== false
    )

    if (!validThemeImages || validThemeImages.length < 1) {
      return res.status(400).json({ error: 'Tema inválido ou sem títulos válidos disponíveis.' })
    }

    const safeCount = Math.min(Number(count) || 4, validThemeImages.length)
    const selectedImages = shuffle(validThemeImages).slice(0, safeCount)

    // --- STEP 1: Resolve correct titles for AI images via Vision ---
    // Do this BEFORE building the options pool so resolved titles are included
    const resolvedImages = await Promise.all(
      selectedImages.map(async (img) => {
        // If already resolved by a previous request, use stored title directly
        if (img.source === 'ai' && img.aiTitleResolved === true) {
          return { ...img }
        }

        if (img.source === 'ai' && img.url) {
          const candidate = String(img.title || img.description || '').trim()

          // Step A: Try to resolve using DB matching / fallback generation before vision.
          const fallbackTitle = await resolveAIImageTitle('images', normalizedTheme, candidate)
          if (fallbackTitle && fallbackTitle !== img.title) {
            collection.updateOne(
              { _id: img._id },
              { $set: { title: fallbackTitle, aiTitleResolved: true } }
            ).catch(() => {})
            return { ...img, title: fallbackTitle, aiTitleResolved: true }
          }

          // Build candidate title pool for vision: all non-AI word titles from this theme
          // (we don't include other unresolved AI titles to avoid circular contamination)
          const nonAiWordTitles = filterWordTitles(
            Array.from(new Set(
              validThemeImages
                .filter(i => i.source !== 'ai' || i.aiTitleResolved === true)
                .map(i => i.title as string)
            ))
          )

          // Fall back to all word titles if not enough non-AI ones
          const allWordTitles = filterWordTitles(
            Array.from(new Set(validThemeImages.map(i => i.title as string)))
          )
          const candidatePool = nonAiWordTitles.length >= 2 ? nonAiWordTitles : allWordTitles

          if (candidatePool.length >= 2) {
            const visionTitle = await resolveAIImageTitleByVision(img.url, candidatePool, 'images')
            if (visionTitle) {
              // Persist resolved title so we skip vision next time
              collection.updateOne(
                { _id: img._id },
                { $set: { title: visionTitle, aiTitleResolved: true } }
              ).catch(() => {})
              return { ...img, title: visionTitle, aiTitleResolved: true }
            }
          }
        }

        return { ...img }
      })
    )

    // --- STEP 2: Build options pool from ALL valid titles (including just-resolved ones) ---
    const allValidTitles = Array.from(new Set(validThemeImages.map(img => img.title as string)))
    const resolvedAiTitles = (resolvedImages as any[])
      .filter(img => img.source === 'ai' && img.aiTitleResolved)
      .map(img => img.title as string)

    // Merge resolved titles into the pool so they appear as options
    const mergedTitles = Array.from(new Set([...allValidTitles, ...resolvedAiTitles]))
    const wordTitles = filterWordTitles(mergedTitles)
    const validTitles = wordTitles.length >= 2 ? wordTitles : mergedTitles

    const safeOptionsCount = Math.min(Math.max(Number(optionsCount) || 4, 2), validTitles.length)

    // --- STEP 3: Build final response with correct options for each card ---
    const imagesWithOptions = resolvedImages.map(img => {
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
