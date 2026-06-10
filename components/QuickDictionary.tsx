/**
 * QuickDictionary (Dicionário Rápido)
 *
 * A floating dictionary panel that lets users look up any French word or phrase
 * instantly using the Anthropic API. Shows: meaning, pronunciation, example sentence,
 * and a memory tip.
 *
 * Usage: place <QuickDictionary /> anywhere in the layout (e.g., game.tsx or classes.tsx).
 * It renders as a floating button (bottom-right corner) that expands into a panel.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LookupResult {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaningPt: string;
  exampleFr: string;
  examplePt: string;
  memoryTip: string;
}

export default function QuickDictionary() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<LookupResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const lookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Você é um dicionário francês-português. Para a palavra ou expressão "${query.trim()}", responda APENAS com um JSON neste formato exato (sem markdown, sem texto extra):
{
  "word": "palavra/expressão exata",
  "pronunciation": "pronúncia fonética simplificada em português",
  "partOfSpeech": "substantivo/verbo/adjetivo/etc",
  "meaningPt": "significado em português",
  "exampleFr": "exemplo de frase em francês",
  "examplePt": "tradução do exemplo",
  "memoryTip": "dica criativa para memorizar"
}`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);

      const data = await res.json();
      const text = data.content?.find((b: any) => b.type === 'text')?.text || '';

      // Strip possible markdown fences
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed: LookupResult = JSON.parse(clean);

      setResult(parsed);
      setHistory(prev => {
        const filtered = prev.filter(h => h.word !== parsed.word);
        return [parsed, ...filtered].slice(0, 10);
      });
    } catch (err) {
      setError('Não foi possível buscar a palavra. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') lookup();
  };

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              key="fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700
                shadow-[0_0_20px_rgba(0,200,220,0.4)] flex items-center justify-center
                text-white text-2xl cursor-pointer border border-cyan-500/50
                hover:shadow-[0_0_30px_rgba(0,200,220,0.6)] transition-shadow"
              title="Dicionário Rápido"
            >
              📖
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Panel ── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute bottom-0 right-0 w-80 sm:w-96 bg-gray-900/95 backdrop-blur-md
                rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  <span className="text-white font-semibold text-sm">Dicionário Rápido</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div className="p-4">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Palavra ou expressão em francês..."
                    className="flex-1 bg-white/5 border border-white/10 text-white placeholder-gray-600
                      rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <button
                    onClick={lookup}
                    disabled={loading || !query.trim()}
                    className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-sm
                      font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : '🔍'}
                  </button>
                </div>

                {error && (
                  <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
              </div>

              {/* Result */}
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    key={result.word}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-4 pb-4 space-y-3"
                  >
                    {/* Word header */}
                    <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/20 rounded-xl p-3 border border-cyan-800/30">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-cyan-300 font-bold text-lg">{result.word}</span>
                        <span className="text-gray-400 text-xs">[{result.pronunciation}]</span>
                        <span className="bg-blue-800/50 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                          {result.partOfSpeech}
                        </span>
                      </div>
                      <p className="text-white text-sm mt-1 font-medium">{result.meaningPt}</p>
                    </div>

                    {/* Example */}
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-yellow-400 mr-1">🇫🇷</span>
                        <em className="text-gray-200">{result.exampleFr}</em>
                      </p>
                      <p className="text-sm text-gray-400 pl-5">{result.examplePt}</p>
                    </div>

                    {/* Memory tip */}
                    <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
                      <p className="text-xs text-purple-300 font-medium mb-1">💡 Dica de memória</p>
                      <p className="text-gray-300 text-xs">{result.memoryTip}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              {history.length > 1 && !result && (
                <div className="px-4 pb-4">
                  <p className="text-gray-500 text-xs mb-2 font-medium">Pesquisas recentes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {history.slice(1, 8).map((h) => (
                      <button
                        key={h.word}
                        onClick={() => { setQuery(h.word); setResult(h); }}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs px-2.5 py-1
                          rounded-lg transition cursor-pointer border border-white/5"
                      >
                        {h.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {history.length > 0 && result && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <p className="text-gray-500 text-xs mb-2">Histórico</p>
                  <div className="flex flex-wrap gap-1.5">
                    {history.slice(0, 6).map((h) => (
                      <button
                        key={h.word}
                        onClick={() => { setQuery(h.word); setResult(h); }}
                        className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer border
                          ${h.word === result.word
                            ? 'bg-cyan-800/40 text-cyan-300 border-cyan-700/50'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
                          }`}
                      >
                        {h.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
