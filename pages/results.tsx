// pages/results.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FaMedal } from 'react-icons/fa';


interface Progress {
  round: number;
  correct_word: number;
}


export default function ResultsPage() {
  //const [progress, setProgress] = useState<{ round: number, correct: number }[]>([])
  const [progress, setProgress] = useState<Progress[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  
  const router = useRouter()

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
    setIsLogoutVisible(true);
  };

  const handleMouseLeave = () => {
    // Define um timeout para esconder o logout após um pequeno atraso
    const timeoutId = setTimeout(() => {
      setIsLogoutVisible(false);
    }, 300); // Ajuste o valor do atraso (em milissegundos) conforme necessário
    setLogoutTimeoutId(timeoutId);
  }

  const handleLogoutMouseEnter = () => {
    // Se o mouse entrar no botão de logout, cancela o timeout de desaparecimento
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
  };

  
  useEffect(() => {
    const saved = localStorage.getItem('progress')
    if (saved) {
      const parsed: Progress[] = JSON.parse(saved);
      setProgress(parsed);
      if (parsed.length > 0) {
        setCurrentProgress(parsed[parsed.length - 1].correct_word);
        setIsFlashing(parsed[parsed.length - 1].correct_word === 4);
      } else {
        setCurrentProgress(0);
        setIsFlashing(false);
      }
    }
  }, []);


  useEffect(() => {
    if (progress.length > 0) {
      const lastProgress = progress[progress.length - 1].correct_word;
      setCurrentProgress(lastProgress);
      setIsFlashing(lastProgress === 4);
    } else {
      setCurrentProgress(0);
      setIsFlashing(false);
    }
  }, [progress]);


  const clearProgress = () => {
    localStorage.removeItem('progress');
    setProgress([]);
    setCurrentProgress(0);
    setIsFlashing(false);
  };

  const bestRound = progress.reduce((prev, curr) => (curr.correct_word > prev.correct_word ? curr : prev), { round: 0, correct_word: 0 })

  const progressPercentage = (currentProgress / 4) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header com perfil */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/game')} 
          className="fixed flex border border-blue items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 mt-10 cursor-pointer">
          <ChevronLeft className="mr-2" color="blue" /> Voltar ao jogo
        </button>
        
      </div>      
      
      <h1 className="text-3xl font-bold mt-30 mb-4 text-center">Seu Progresso</h1>
      
      {/* Barra de Progresso */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="bg-gray-800 rounded-full h-4 relative overflow-hidden">
          <div
            className={`bg-green h-full rounded-full transition-all duration-500 ease-out absolute left-0 top-0 ${
              isFlashing ? 'animate-progress-flash' : ''
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold">
            {currentProgress} / 4
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1 text-center">Progresso para a Medalha de Ouro</p>
      </div>

      {progress.length === 0 ? (
        <p className="text-center text-gray-400">Você ainda não fez nenhuma jogada.</p>
      ) : (
        <>
          <div className="max-w-md mx-auto space-y-4 mb-8">
            {progress.map((p, i) => (
              <div
                key={i}
                className={`bg-white text-black p-4 rounded-xl shadow-md flex justify-between items-center ${p.correct_word === bestRound.correct_word ? 'border-2 border-yellow-400' : ''}`}
              >
                <span>Jogada {p.round}</span>
                <span>
                  {p.correct_word} acertos
                  {p.correct_word === 4 && <FaMedal color="gold" className="inline-block ml-2 medalha-brilho-ouro" />}
                  {p.correct_word === 3 && <FaMedal color="silver" className="inline-block ml-2 medalha-brilho-prata" />}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
              <button
                onClick={clearProgress}
                className="flex items-center border border-white bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 cursor-pointer"
              >
                <Trash2 className="mr-2" color="red" /> Limpar Jogadas
              </button>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-4">Estatísticas de Acertos</h2>
          <div className="h-72 w-full max-w-3xl mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" label={{ value: 'Jogada', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Acertos', angle: -90, position: 'insideLeft' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="correct_answer" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center mt-8 text-lg">
            🏆 Melhor desempenho: <strong>{bestRound.correct_word}</strong> acertos na jogada {bestRound.round}
          </div>
        </>

      )}
    </div>
  )
}

// Função para salvar progresso após cada rodada
export const saveProgress = (correct_word: number) => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('progress')
    const parsed = saved ? JSON.parse(saved) : []
    const round = parsed.length + 1
    parsed.push({ round, correct_word })
    localStorage.setItem('progress', JSON.stringify(parsed))
}