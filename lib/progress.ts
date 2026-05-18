export interface LearningProgressEntry {
  round: number
  score: number
  theme?: string
  date: string
  xp: number
  perfect: boolean
}

const STORAGE_KEY = 'learning_progress'
const LEGACY_STORAGE_KEY = 'progress_answers'

const normalizeEntry = (item: any, index: number): LearningProgressEntry => {
  const score = Number(
    item.score ?? item.correct_word ?? item.correct_answer ?? item.correct_proverb ?? 0,
  )
  const theme = item.theme || item.theme
  const date = item.date || new Date().toISOString().split('T')[0]
  const xp = Number(item.xp ?? score * 10 + (score >= 4 ? 20 : 0))
  const perfect = item.perfect ?? score >= 4

  return {
    round: Number(item.round ?? index + 1),
    score,
    theme,
    date,
    xp,
    perfect,
  }
}

export const saveProgress = (score: number, theme?: string) => {
  if (typeof window === 'undefined') return

  const saved = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY)
  const parsed = saved ? JSON.parse(saved) : []
  const entry: LearningProgressEntry = {
    round: parsed.length + 1,
    score,
    theme,
    date: new Date().toISOString().split('T')[0],
    xp: score * 10 + (score >= 4 ? 20 : 0),
    perfect: score >= 4,
  }
  parsed.push(entry)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
}

export const loadProgress = (): LearningProgressEntry[] => {
  if (typeof window === 'undefined') return []

  const saved = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!saved) return []

  const parsed = JSON.parse(saved)
  if (!Array.isArray(parsed)) return []

  return parsed.map((item, index) => normalizeEntry(item, index))
}

export const clearProgress = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export const getProgressSummary = (entries: LearningProgressEntry[]) => {
  const totalXp = entries.reduce((sum, entry) => sum + entry.xp, 0)
  const totalRounds = entries.length
  const perfectRounds = entries.filter(entry => entry.perfect).length
  const uniqueThemes = new Set(entries.filter(entry => entry.theme).map(entry => entry.theme?.toLowerCase())).size
  const currentLevel = Math.max(1, Math.floor(totalXp / 50) + 1)
  const nextLevelXp = currentLevel * 50
  const xpToNext = Math.max(nextLevelXp - totalXp, 0)

  let perfectStreak = 0
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].perfect) perfectStreak += 1
    else break
  }

  return {
    totalXp,
    totalRounds,
    perfectRounds,
    uniqueThemes,
    currentLevel,
    nextLevelXp,
    xpToNext,
    perfectStreak,
    recentScore: entries[entries.length - 1]?.score ?? 0,
    recentTheme: entries[entries.length - 1]?.theme ?? null,
  }
}
