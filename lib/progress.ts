export interface LearningProgressEntry {
  round: number
  score: number
  totalQuestions?: number
  theme?: string
  date: string
  xp: number
  perfect: boolean
  source?: 'vocabulario' | 'frases' | 'ditados'
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
  levelDescription: string
  difficultyLabel: string
}

const STORAGE_KEY = 'learning_progress'
const LEGACY_STORAGE_KEY = 'progress_answers'
const PREMIUM_KEY = 'premium_pack_unlocked'

export const LEVELS = [
  {
    level: 1,
    name: 'Iniciante',
    minXp: 0,
    minRecentScore: 0,
    minPerfectRounds: 0,
    minUniqueThemes: 0,
    description: 'Base visual, quatro imagens por rodada e alternativas mais diretas.',
    difficultyLabel: 'Leve',
    cardsPerRound: 4,
    optionsPerCard: 4,
    attempts: 4,
  },
  {
    level: 2,
    name: 'Intermediario',
    minXp: 80,
    minRecentScore: 3,
    minPerfectRounds: 0,
    minUniqueThemes: 0,
    description: 'Mais volume por rodada e alternativas um pouco mais parecidas.',
    difficultyLabel: 'Moderada',
    cardsPerRound: 5,
    optionsPerCard: 5,
    attempts: 4,
  },
  {
    level: 3,
    name: 'Avancado',
    minXp: 180,
    minRecentScore: 3.5,
    minPerfectRounds: 2,
    minUniqueThemes: 0,
    description: 'Rodadas maiores, menos margem para erro e vocabulario mais variado.',
    difficultyLabel: 'Alta',
    cardsPerRound: 6,
    optionsPerCard: 6,
    attempts: 3,
  },
  {
    level: 4,
    name: 'Fluente',
    minXp: 320,
    minRecentScore: 4,
    minPerfectRounds: 5,
    minUniqueThemes: 4,
    description: 'Treino intenso com mais distratores e exigencia de consistencia.',
    difficultyLabel: 'Intensa',
    cardsPerRound: 6,
    optionsPerCard: 7,
    attempts: 3,
  },
] as const

export const getLevelDifficulty = (level: number) =>
  LEVELS[Math.min(LEVELS.length - 1, Math.max(0, level - 1))]

const getLevelName = (level: number) => getLevelDifficulty(level).name

const normalizeEntry = (item: any, index: number): LearningProgressEntry => {
  const score = Number(
    item.score ?? item.correct_word ?? item.correct_answer ?? item.correct_proverb ?? 0,
  )
  const theme = item.theme
  const date = item.date || new Date().toISOString().split('T')[0]
  const totalQuestions = Number(item.totalQuestions ?? item.total_questions ?? (item.source === 'frases' ? 6 : 4))
  const xp = Number(item.xp ?? score * 10 + (score >= totalQuestions ? 20 : 0))
  const perfect = item.perfect ?? score >= totalQuestions

  return {
    round: Number(item.round ?? index + 1),
    score,
    totalQuestions,
    theme,
    date,
    xp,
    perfect,
    source: item.source ?? 'vocabulario',
  }
}

const getRecentAverageScore = (entries: LearningProgressEntry[]) => {
  const recent = entries.slice(-8)
  if (recent.length === 0) return 0

  return recent.reduce((sum, entry) => {
    const total = Math.max(1, entry.totalQuestions ?? (entry.source === 'frases' ? 6 : 4))
    return sum + Math.min(4, (entry.score / total) * 4)
  }, 0) / recent.length
}

const calculateLevel = (
  totalXp: number,
  entries: LearningProgressEntry[],
  perfectRounds: number,
  uniqueThemes: number,
) => {
  const recentScore = getRecentAverageScore(entries)
  let unlockedLevel = 1

  LEVELS.forEach(level => {
    const passesXp = totalXp >= level.minXp
    const passesScore = !level.minRecentScore || recentScore >= level.minRecentScore
    const passesPerfect = !level.minPerfectRounds || perfectRounds >= level.minPerfectRounds
    const passesThemes = !level.minUniqueThemes || uniqueThemes >= level.minUniqueThemes

    if (passesXp && passesScore && passesPerfect && passesThemes) {
      unlockedLevel = level.level
    }
  })

  return unlockedLevel
}

export const loadPremiumAccess = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(PREMIUM_KEY) === 'true'
}

export const unlockPremiumAccess = () => {
  if (typeof window === 'undefined') return false
  window.localStorage.setItem(PREMIUM_KEY, 'true')
  return true
}

export const saveProgress = (
  score: number,
  theme?: string,
  source: LearningProgressEntry['source'] = 'vocabulario',
  totalQuestions?: number,
) => {
  if (typeof window === 'undefined') return

  const saved = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY)
  const parsed = saved ? JSON.parse(saved) : []
  const perfect = totalQuestions ? score >= totalQuestions : score >= 4
  const entry: LearningProgressEntry = {
    round: parsed.length + 1,
    score,
    totalQuestions,
    theme,
    date: new Date().toISOString().split('T')[0],
    xp: score * 10 + (perfect ? 20 : 0),
    perfect,
    source,
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
  const currentLevel = calculateLevel(totalXp, entries, perfectRounds, uniqueThemes)
  const currentDifficulty = getLevelDifficulty(currentLevel)
  const nextDifficulty = getLevelDifficulty(currentLevel + 1)
  const nextLevelXp = currentLevel >= LEVELS.length ? totalXp : nextDifficulty.minXp
  const xpToNext = Math.max(nextLevelXp - totalXp, 0)
  const levelProgress = currentLevel >= LEVELS.length
    ? 100
    : Math.min(100, Math.round(((totalXp - currentDifficulty.minXp) / Math.max(1, nextDifficulty.minXp - currentDifficulty.minXp)) * 100))

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
    nextLevelName: currentLevel >= LEVELS.length ? 'Nivel maximo' : getLevelName(currentLevel + 1),
    isPremium: loadPremiumAccess(),
    levelDescription: currentDifficulty.description,
    difficultyLabel: currentDifficulty.difficultyLabel,
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
      description = 'Conclua 1 rodada com todas as respostas corretas para ganhar um bonus diario.'
      target = 1
      progress = perfectToday
      rewardXp = 30
      break
    case 1:
      title = 'Ganhe 20 XP hoje'
      description = 'Acumule 20 XP em atividades de frances no dia de hoje.'
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

export const getProgressSummaryBySource = (entries: LearningProgressEntry[], source: LearningProgressEntry['source']) => {
  const filtered = entries.filter(e => e.source === source)
  return {
    uniqueThemes: new Set(filtered.filter(e => e.theme).map(e => e.theme?.toLowerCase())).size,
    perfectRounds: filtered.filter(e => e.perfect).length,
    perfectStreak: (() => {
      let streak = 0
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i].perfect) streak++; else break
      }
      return streak
    })(),
    totalRounds: filtered.length,
  }
}
