export interface LearningProgressEntry {
  round: number
  score: number
  theme?: string
  date: string
  xp: number
  perfect: boolean
}

export interface DailyMission {
  date: string
  title: string
  description: string
  target: number
  progress: number
  completed: boolean
  rewardXp: number
}

export interface ProgressSummary {
  totalXp: number
  totalRounds: number
  perfectRounds: number
  uniqueThemes: number
  currentLevel: number
  nextLevelXp: number
  xpToNext: number
  perfectStreak: number
  recentScore: number
  recentTheme: string | null
  levelName: string
  levelProgress: number
  nextLevelName: string
  isPremium: boolean
}

const STORAGE_KEY = 'learning_progress'
const LEGACY_STORAGE_KEY = 'progress_answers'
const PREMIUM_KEY = 'premium_pack_unlocked'

const LEVEL_NAMES = [
  'Novato',
  'Aprendiz',
  'Explorador',
  'Viajante',
  'Conquistador',
  'Fluente',
  'Mestre do Francês',
]

const normalizeEntry = (item: any, index: number): LearningProgressEntry => {
  const score = Number(
    item.score ?? item.correct_word ?? item.correct_answer ?? item.correct_proverb ?? 0,
  )
  const theme = item.theme ?? item.theme
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

const getLevelName = (level: number) => LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, Math.max(0, level - 1))] || `Nível ${level}`

export const loadPremiumAccess = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(PREMIUM_KEY) === 'true'
}

export const unlockPremiumAccess = () => {
  if (typeof window === 'undefined') return false
  window.localStorage.setItem(PREMIUM_KEY, 'true')
  return true
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
  window.localStorage.removeItem(PREMIUM_KEY)
}

export const getProgressSummary = (entries: LearningProgressEntry[]): ProgressSummary => {
  const totalXp = entries.reduce((sum, entry) => sum + entry.xp, 0)
  const totalRounds = entries.length
  const perfectRounds = entries.filter(entry => entry.perfect).length
  const uniqueThemes = new Set(entries.filter(entry => entry.theme).map(entry => entry.theme?.toLowerCase())).size
  const currentLevel = Math.max(1, Math.floor(totalXp / 50) + 1)
  const nextLevelXp = currentLevel * 50
  const xpToNext = Math.max(nextLevelXp - totalXp, 0)
  const levelProgress = Math.min(100, Math.round(((totalXp - (currentLevel - 1) * 50) / 50) * 100))

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
    levelName: getLevelName(currentLevel),
    levelProgress,
    nextLevelName: getLevelName(currentLevel + 1),
    isPremium: loadPremiumAccess(),
  }
}

export const getDailyMission = (entries: LearningProgressEntry[]): DailyMission => {
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter(entry => entry.date === today)
  const xpToday = todayEntries.reduce((sum, entry) => sum + entry.xp, 0)
  const perfectToday = todayEntries.filter(entry => entry.perfect).length
  const uniqueTodayThemes = new Set(todayEntries.map(entry => entry.theme?.toLowerCase()).filter(Boolean)).size

  const missionIndex = new Date(today).getDate() % 3
  let title = ''
  let description = ''
  let target = 1
  let progress = 0
  let rewardXp = 20

  switch (missionIndex) {
    case 0:
      title = 'Feche uma rodada perfeita'
      description = 'Conclua 1 rodada com todas as respostas corretas para ganhar um bônus diário.'
      target = 1
      progress = perfectToday
      rewardXp = 30
      break
    case 1:
      title = 'Ganhe 20 XP hoje'
      description = 'Acumule 20 XP em atividades de francês no dia de hoje.'
      target = 20
      progress = Math.min(xpToday, target)
      rewardXp = 30
      break
    case 2:
      title = 'Use 2 temas diferentes'
      description = 'Pratique pelo menos dois temas diferentes hoje para manter a rotina variada.'
      target = 2
      progress = Math.min(uniqueTodayThemes, target)
      rewardXp = 25
      break
    default:
      title = 'Jogue 1 rodada'
      description = 'Complete uma rodada hoje para manter seu progresso.'
      target = 1
      progress = todayEntries.length
      rewardXp = 20
  }

  return {
    date: today,
    title,
    description,
    target,
    progress,
    completed: progress >= target,
    rewardXp,
  }
}
