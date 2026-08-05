/**
 * AI Image Resolver
 * Uses Claude Vision to identify what an AI-generated image actually shows,
 * then finds the closest matching title from the database.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Normalize text for comparison: remove accents, lowercase, trim
const normalizeForMatch = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ');

// Checks if a title looks like a single French word/expression (for game.tsx)
export const isWordTitle = (title: string): boolean => {
  const t = title.trim();
  if (!t) return false;
  const wordCount = t.split(/\s+/).length;
  // Allow articles + noun, e.g. "La porte", "Le chat", "L'aéroport"
  // Reject sentences (end with . ! ?) and long phrases (>4 words)
  return wordCount <= 4 && !t.endsWith('.') && !t.endsWith('!') && !t.endsWith('?') && !t.includes(',');
};

// Checks if a title looks like a French sentence (for frases.tsx)
export const isSentenceTitle = (title: string): boolean => {
  const t = title.trim();
  if (!t) return false;
  const wordCount = t.split(/\s+/).length;
  return wordCount >= 4 || t.endsWith('.') || t.endsWith('!') || t.endsWith('?');
};

// Filters titles to only include words (for game.tsx - images collection)
export const filterWordTitles = (titles: string[]): string[] =>
  titles.filter(isWordTitle);

// Filters titles to only include sentences (for frases.tsx - images_sentences collection)
export const filterSentenceTitles = (titles: string[]): string[] =>
  titles.filter(isSentenceTitle);

// Fetch image as base64
const fetchImageAsBase64 = async (url: string): Promise<{ data: string; mediaType: string } | null> => {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    // Only allow valid image media types
    const rawType = contentType.split(';')[0].trim();
    const mediaType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawType)
      ? rawType
      : 'image/jpeg';
    const buffer = await resp.arrayBuffer();
    // Limit to 5MB to avoid token overload
    if (buffer.byteLength > 5 * 1024 * 1024) return null;
    const data = Buffer.from(buffer).toString('base64');
    return { data, mediaType };
  } catch {
    return null;
  }
};

// Literal token the vision model must reply with when nothing in the list
// actually matches what's in the image. Forcing a choice from the list even
// when none apply was the root cause of images being labeled with unrelated
// captions (e.g. a sand photo resolving to "La tasse").
export const NO_MATCH_TOKEN = 'NENHUMA_OPCAO_CORRESPONDE';

// Find best matching title from list using normalized comparison.
// Deliberately conservative: short "word" titles (game.tsx / vocabulary,
// typically 1-4 words like "La tasse", "Le chien") require an exact match
// after normalization — fuzzy/partial matching on such short strings is
// how unrelated titles ended up "matching" each other. Fuzzy overlap
// scoring is reserved for longer sentence titles (frases.tsx), where a
// single shared short word is not enough evidence.
const findBestMatch = (identified: string, validTitles: string[]): string | null => {
  const normIdentified = normalizeForMatch(identified);
  if (!normIdentified) return null;

  // 1. Exact match after normalization — always safe.
  const exactMatch = validTitles.find(
    t => normalizeForMatch(t) === normIdentified
  );
  if (exactMatch) return exactMatch;

  // Everything below is only applied to longer (sentence-like) titles.
  // Short word/expression titles must match exactly or not at all,
  // otherwise unrelated short titles can share enough surface text to
  // false-positive against each other.
  const isShortTitleSet = validTitles.every(t => t.trim().split(/\s+/).length <= 4);
  if (isShortTitleSet) return null;

  // 2. Key word overlap (for longer titles like sentences). Requires a
  // meaningful fraction of the CANDIDATE title's distinctive words to be
  // present, and at least 2 overlapping content words, to avoid a single
  // incidental shared word triggering a match.
  const identifiedWords = new Set(normIdentified.split(/\s+/).filter(w => w.length > 3));
  if (identifiedWords.size > 0) {
    let bestScore = 0;
    let bestTitle: string | null = null;
    let bestOverlap = 0;
    for (const t of validTitles) {
      const titleWords = normalizeForMatch(t).split(/\s+/).filter(w => w.length > 3);
      const overlap = titleWords.filter(w => identifiedWords.has(w)).length;
      const score = overlap / Math.max(titleWords.length, 1);
      if (score > bestScore) {
        bestScore = score;
        bestTitle = t;
        bestOverlap = overlap;
      }
    }
    if (bestScore >= 0.6 && bestOverlap >= 2) return bestTitle;
  }

  return null;
};

/**
 * Uses Claude Vision to identify what an AI image shows, then returns
 * the closest matching title from the provided list of valid titles.
 *
 * Returns:
 * - { title } when a confident match was found (may equal the intended title)
 * - { title: null, abstained: true } when the model explicitly found no
 *   match — the caller should NOT fall back to the original/intended title
 *   in this case, since that was the exact assumption that produced
 *   mislabeled images before. Instead, the caller should mark the image
 *   unvalidated so it isn't served with a possibly-wrong caption.
 * - null when vision itself failed (network/API error) — caller decides
 *   how to handle (e.g. treat as unverified, retry later).
 */
export const resolveAIImageTitleByVision = async (
  imageUrl: string,
  validTitles: string[],
  collectionName: 'images' | 'images_sentences' | 'images_proverbs'
): Promise<{ title: string | null; abstained?: boolean } | null> => {
  if (!ANTHROPIC_API_KEY || !validTitles.length) return null;

  try {
    const imageData = await fetchImageAsBase64(imageUrl);
    if (!imageData) return null;

    // Build prompt based on collection type
    let identificationPrompt: string;
    const titleList = validTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');

    const abstainInstruction = `\n\nIMPORTANT: Only choose an option if it genuinely and specifically matches what is shown. If NONE of the options accurately describe the main subject of the image, reply with exactly this text instead: ${NO_MATCH_TOKEN}`;

    if (collectionName === 'images') {
      identificationPrompt =
        `Look carefully at this image. Choose from the list below the French word or expression that best describes the MAIN object or scene you see.\n\nList:\n${titleList}\n\nReply with ONLY the exact text of your chosen option (copy it exactly as written above, including accents). Do not add any explanation.${abstainInstruction}`;
    } else if (collectionName === 'images_sentences') {
      identificationPrompt =
        `Look carefully at this image. Choose from the list below the French sentence that best describes what is happening or what is depicted in the scene.\n\nList:\n${titleList}\n\nReply with ONLY the exact text of your chosen option (copy it exactly as written above, including accents). Do not add any explanation.${abstainInstruction}`;
    } else {
      identificationPrompt =
        `Look carefully at this image. It illustrates a French proverb or saying. Choose from the list below the explanation that best matches the symbolic meaning or theme of this image.\n\nList:\n${titleList}\n\nReply with ONLY the exact text of your chosen option (copy it exactly as written above). Do not add any explanation.${abstainInstruction}`;
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType,
                  data: imageData.data,
                },
              },
              {
                type: 'text',
                text: identificationPrompt,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!resp.ok) {
      console.warn('[AI Vision] API error:', resp.status, await resp.text().catch(() => ''));
      return null;
    }

    const data = await resp.json();
    const raw = (data.content?.[0]?.text || '').trim();
    if (!raw) return null;

    // Claude might return "1. La porte" or just "La porte" - strip numbering
    const identified = raw.replace(/^\d+\.\s*/, '').trim();

    if (normalizeForMatch(identified) === normalizeForMatch(NO_MATCH_TOKEN) || identified.includes(NO_MATCH_TOKEN)) {
      console.warn(`[AI Vision] Model abstained — no candidate title matched the image (${collectionName})`);
      return { title: null, abstained: true };
    }

    // Find best match with normalized comparison
    const match = findBestMatch(identified, validTitles);
    if (match) {
      console.log(`[AI Vision] Resolved: "${identified}" → "${match}"`);
      return { title: match };
    }

    console.warn(`[AI Vision] No confident match found for "${identified}" in ${validTitles.length} titles`);
    return { title: null, abstained: true };
  } catch (err) {
    console.warn('[AI Vision] Failed:', err);
    return null;
  }
};
