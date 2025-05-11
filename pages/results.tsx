// pages/results.tsx
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { ChevronLeft, Trash } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
//import { signOut, useSession } from 'next-auth/react'
import { FaMedal } from 'react-icons/fa';
import { FaChartBar } from 'react-icons/fa';


interface Progress {
  round: number;
  correct_word: number;
}


export default function ResultsPage() {
  //const [progress_phrases, setProgressPhrases] = useState<{ round: number, correct_phrase: number }[]>([])
  const [progress_answers, setProgressAnswers] = useState<Progress[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  //const { data: session } = useSession()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  
     
  const showToast = (message: string, type: 'info' | 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Exibir por 3 segundos
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

      
  useEffect(() => {
    const saved = localStorage.getItem('progress_answers')
    if (saved) {
      const parsed: Progress[] = JSON.parse(saved);
      setProgressAnswers(parsed);
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
    if (progress_answers.length > 0) {
      const lastProgress = progress_answers[progress_answers.length - 1].correct_word;
      setCurrentProgress(lastProgress);
      setIsFlashing(lastProgress === 4);
    } else {
      setCurrentProgress(0);
      setIsFlashing(false);
    }
  }, [progress_answers]);

                          
  const handleMouseEnter = () => {
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
    setIsLogoutVisible(true);
  };

  
  const clearProgress = () => {
    localStorage.removeItem('progress_answers');
    setProgressAnswers([]);
    setCurrentProgress(0);
    setIsFlashing(false);
  };

  const bestRound = progress_answers.reduce((prev, curr) => (curr.correct_word > prev.correct_word ? curr : prev), { round: 0, correct_word: 0 })

  const progressPercentage = (currentProgress / 4) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header com perfil */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/game')} 
          className="absolute flex border text-gray-300 border-blue items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 mt-50 cursor-pointer">
          <ChevronLeft className="mr-2" color="blue" /> Voltar ao jogo
        </button>
        
      </div>      
           
      
      <h1 className="text-3xl font-bold text-gray-300 mt-40 mb-4 text-center">Seu Progresso</h1>
      
      {/* Barra de Progresso */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="bg-gray-800 rounded-full h-4 relative overflow-hidden animate-pulse-slow">
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
        <p className="text-sm text-gray-400 mt-3 text-center">Progresso para a Medalha de Ouro</p>
      </div>

      {progress_answers.length === 0 ? (
        <p className="text-center text-gray-400">Você ainda não fez nenhuma jogada.</p>
      ) : (
        <>
          <div className="max-w-md mx-auto space-y-4 mb-8">
            {progress_answers.map((p, i) => (
              <div
              key={i}
              className={`bg-white text-black p-4 rounded-xl shadow-md flex justify-between items-center ${p.correct_word === bestRound.correct_word ? 'border-2 border-green ' : ''}`}
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
                className="flex items-center border border-red bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 cursor-pointer"
              >
                <Trash className="mr-2" color="red" /> Limpar Jogadas
              </button>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-300 flex items-center justify-center gap-2 mb-6">
            Estatísticas de Acertos
          </h2>

          <div className="h-80 w-full max-w-4xl mx-auto rounded-2xl bg-white shadow-xl p-4 dark:bg-zinc-900 dark:shadow-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progress_answers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="round" 
                  label={{ value: 'Jogada', position: 'insideBottomRight', offset: -5 }}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  label={{ value: 'Acertos', angle: -90, position: 'insideLeft' }}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: '#d1d5db' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", borderColor: "#d1d5db", borderRadius: "8px", padding: "10px" }}
                  labelStyle={{ color: "#4b5563", fontWeight: "bold" }}
                />
                <Bar 
                  dataKey="correct_word"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                />
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center mt-10 text-lg text-zinc-700 dark:text-zinc-300">
            🏆 Melhor desempenho: <strong className="text-green dark:text-blue">{bestRound.correct_word}</strong> acertos na jogada <strong className='text-green'>{bestRound.round}</strong>
          </div>
        </>

      )}
    </div>
  )
}


// Função para salvar progresso após cada rodada
export const saveProgress = (correct_word: number) => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('progress_answers')
    const parsed = saved ? JSON.parse(saved) : []
    const round = parsed.length + 1
    parsed.push({ round, correct_word })
    localStorage.setItem('progress_answers', JSON.stringify(parsed))
}