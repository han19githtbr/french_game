/**
 * DailyPhrase (Frase do Dia)
 *
 * Shows a motivational French phrase of the day with translation and audio hint.
 * Displayed as a dismissible banner on game.tsx / classes.tsx.
 * Phrase changes once per day (persisted in localStorage).
 *
 * To use: <DailyPhrase /> anywhere above the fold.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Phrase {
  fr: string;
  pt: string;
  author?: string;
}

// Static seed phrases (shown when API is unavailable / rate-limited)
const SEED_PHRASES: Phrase[] = [
  { fr: 'Petit à petit, l'oiseau fait son nid.', pt: 'Pouco a pouco, o pássaro constrói seu ninho.', author: 'Provérbio francês' },
  { fr: 'La vie est belle.', pt: 'A vida é bela.', author: 'Expressão popular' },
  { fr: 'Chaque jour est une nouvelle chance.', pt: 'Cada dia é uma nova oportunidade.', author: 'Provérbio' },
  { fr: 'Vouloir c'est pouvoir.', pt: 'Querer é poder.', author: 'Provérbio francês' },
  { fr: 'Le soleil brille pour tout le monde.', pt: 'O sol brilha para todos.', author: 'Provérbio' },
  { fr: 'Mieux vaut tard que jamais.', pt: 'Melhor tarde do que nunca.', author: 'Provérbio francês' },
  { fr: 'La connaissance est une lumière.', pt: 'O conhecimento é uma luz.', author: 'Expressão popular' },
];

const getTodayKey = () => {
  const d = new Date();
  return `daily-phrase-${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

export default function DailyPhrase() {
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const key = getTodayKey();
    const dismissedKey = `${key}-dismissed`;

    // Don't show if already dismissed today
    if (typeof window !== 'undefined' && localStorage.getItem(dismissedKey)) {
      setVisible(false);
      return;
    }

    // Check if we already fetched today
    const cached = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (cached) {
      try {
        setPhrase(JSON.parse(cached));
        return;
      } catch { /* fall through */ }
    }

    // Pick a seed phrase (rotate by day of year)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const seedPhrase = SEED_PHRASES[dayOfYear % SEED_PHRASES.length];
    setPhrase(seedPhrase);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(seedPhrase));
    }

    // Try to fetch a fresh phrase from AI (non-blocking, updates if successful)
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: 'Give me ONE inspirational or poetic French phrase or proverb suitable for French language learners. Reply ONLY with valid JSON (no markdown): {"fr":"...","pt":"...","author":"..."} where pt is the Brazilian Portuguese translation.',
        }],
      }),
    }).then(r => r.json()).then(data => {
      const text = data.content?.find((b: any) => b.type === 'text')?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed: Phrase = JSON.parse(clean);
      if (parsed.fr && parsed.pt) {
        setPhrase(parsed);
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    }).catch(() => undefined);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${getTodayKey()}-dismissed`, '1');
    }
  };

  const handleCopy = () => {
    if (!phrase) return;
    navigator.clipboard.writeText(`${phrase.fr}\n— ${phrase.pt}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!phrase) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-2xl mb-5"
        >
          <div className="relative bg-gradient-to-r from-indigo-900/40 to-cyan-900/30
            border border-indigo-700/30 rounded-2xl px-5 py-4 backdrop-blur-sm">

            {/* Decorative quote mark */}
            <span className="absolute top-2 left-3 text-indigo-400/30 text-5xl font-serif leading-none select-none">
              &ldquo;
            </span>

            <div className="pl-4">
              <p className="text-sm text-yellow-200 font-medium mb-0.5">🗓 Frase do dia</p>
              <p className="text-white font-semibold text-base leading-snug mb-1">
                {phrase.fr}
              </p>
              <p className="text-gray-400 text-sm italic">{phrase.pt}</p>
              {phrase.author && (
                <p className="text-gray-600 text-xs mt-1">— {phrase.author}</p>
              )}
            </div>

            {/* Actions */}
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={handleCopy}
                title="Copiar frase"
                className="text-gray-500 hover:text-cyan-400 transition text-sm cursor-pointer"
              >
                {copied ? '✅' : '📋'}
              </button>
              <button
                onClick={handleDismiss}
                title="Dispensar"
                className="text-gray-600 hover:text-gray-300 transition text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
