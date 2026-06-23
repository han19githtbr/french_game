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

    // Busca TODOS os itens do tema para ter um pool grande de opções
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
    const initialSelectionCount = Math.min(validThemeImages.length, safeCount * 3)
    const selectedImages = shuffle(validThemeImages).slice(0, initialSelectionCount)

    // --- STEP 1: Resolve correct titles for AI images via Vision ---
    const resolvedImages = await Promise.all(
      selectedImages.map(async (img) => {
        if (img.source === 'ai' && img.aiTitleResolved === true) {
          return { ...img }
        }

        if (img.source === 'ai' && img.url) {
          const candidate = String(img.description || img.title || '').trim()

          // Step A: Try DB matching first
          const fallbackTitle = await resolveAIImageTitle('images', normalizedTheme, candidate)
          if (fallbackTitle && fallbackTitle !== img.title && !isInvalidCaptionTitle(fallbackTitle)) {
            collection.updateOne(
              { _id: img._id },
              { $set: { title: fallbackTitle, aiTitleResolved: true } }
            ).catch(() => {})
            return { ...img, title: fallbackTitle, aiTitleResolved: true }
          }

          // Step B: Vision - use ALL non-AI word titles from this theme as candidates
          // This gives Vision the full vocabulary pool to choose from
          const allNonAiWordTitles = filterWordTitles(
            Array.from(new Set(
              validThemeImages
                .filter(i => i.source !== 'ai' || i.aiTitleResolved === true)
                .map(i => i.title as string)
            ))
          )

          const allWordTitles = filterWordTitles(
            Array.from(new Set(validThemeImages.map(i => i.title as string)))
          )
          const candidatePool = allNonAiWordTitles.length >= 2 ? allNonAiWordTitles : allWordTitles

          if (candidatePool.length >= 2) {
            const visionTitle = await resolveAIImageTitleByVision(img.url, candidatePool, 'images')
            if (visionTitle && !isInvalidCaptionTitle(visionTitle)) {
              collection.updateOne(
                { _id: img._id },
                { $set: { title: visionTitle, aiTitleResolved: true } }
              ).catch(() => {})
              return { ...img, title: visionTitle, aiTitleResolved: true }
            }
          }

          // Step C: If Vision also fails, mark as unresolved so it doesn't appear with wrong title
          // Only include if we have a non-generic title
          if (!isInvalidCaptionTitle(img.title)) {
            return { ...img }
          }
          // Skip this AI image entirely if we can't resolve its title
          return { ...img, _skipUnresolved: true }
        }

        return { ...img }
      })
    )

    // --- STEP 2: Filter out unresolved AI images with bad titles ---
    const cleanResolved = resolvedImages.filter((img: any) => !img._skipUnresolved)

    const stableImages = (cleanResolved as any[])
      .filter(img => !(img.source === 'ai' && img.url && img.aiTitleResolved !== true))
    const finalImages = stableImages.length >= safeCount
      ? stableImages.slice(0, safeCount)
      : (cleanResolved as any[]).slice(0, safeCount)

    // --- STEP 3: Build a RICH options pool ---
    // Include: all valid non-AI titles + resolved AI titles
    // This ensures the correct answer always appears in options
    const resolvedAiTitles = (cleanResolved as any[])
      .filter((img: any) => img.source === 'ai' && img.aiTitleResolved)
      .map((img: any) => img.title as string)

    const allNonAiTitles = filterWordTitles(
      Array.from(new Set(
        validThemeImages
          .filter(i => i.source !== 'ai')
          .map(i => i.title as string)
      ))
    )

    // Merge: non-AI titles + resolved AI titles
    const mergedTitles = Array.from(new Set([...allNonAiTitles, ...resolvedAiTitles]))
    const wordTitles = filterWordTitles(mergedTitles)
    const validTitles = wordTitles.length >= 2 ? wordTitles : mergedTitles

    const safeOptionsCount = Math.min(Math.max(Number(optionsCount) || 4, 2), validTitles.length)

    // --- STEP 4: Build final response ---
    const imagesWithOptions = finalImages.map(img => {
      const imgData = img as any
      return {
        url: imgData.url,
        title: imgData.title,
        description: imgData.description || '',
        aiGenerated: imgData.source === 'ai',
        validated: imgData.validated,
        // Ensure correct title is always in options
        options: randomOptions(imgData.title as string, validTitles, safeOptionsCount),
      }
    })

    return res.status(200).json(imagesWithOptions)
  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    return res.status(500).json({ error: 'Erro interno ao buscar imagens.' })
  }
}