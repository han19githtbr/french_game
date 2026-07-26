const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const normalizeOption = (value: string) => String(value || '').trim().toLowerCase();

export const buildResponseOptions = (
  correct: string,
  availableTitles: string[],
  optionsCount: number,
  fallbackPool: string[] = [],
) => {
  const safeCorrect = String(correct || '').trim();
  if (!safeCorrect) return [];

  const safeOptionsCount = Math.max(2, Math.min(6, Number(optionsCount) || 4));
  const cleanTitles = Array.from(new Set((availableTitles || []).map(t => String(t || '').trim()).filter(Boolean)));
  const cleanFallback = Array.from(new Set((fallbackPool || []).map(t => String(t || '').trim()).filter(Boolean)));

  const pool = Array.from(new Set([...cleanTitles, ...cleanFallback].filter(Boolean)));
  const poolWithoutCorrect = pool.filter(option => normalizeOption(option) !== normalizeOption(safeCorrect));

  const chosen = [safeCorrect, ...shuffle(poolWithoutCorrect).slice(0, Math.max(0, safeOptionsCount - 1))];
  const unique = Array.from(new Set(chosen.filter(Boolean)));

  if (unique.length < safeOptionsCount) {
    const extras = shuffle(poolWithoutCorrect.filter(option => !unique.includes(option))).slice(0, safeOptionsCount - unique.length);
    unique.push(...extras);
  }

  return shuffle(unique).slice(0, safeOptionsCount);
};
