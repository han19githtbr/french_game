// pages/results.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ChevronLeft, Trash } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FaMedal, FaCrown } from 'react-icons/fa';
import { clearProgress as clearStoredProgress, getProgressSummary, loadProgress, LearningProgressEntry } from '../lib/progress'

interface SuperPlayerRecord {
  username: string;
  totalPlays: number;
  timestamp: Date;
}

export default function ResultsPage() {
  const [progressEntries, setProgressEntries] = useState<LearningProgressEntry[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [progressSummary, setProgressSummary] = useState(getProgressSummary([]));
  const [isFlashing, setIsFlashing] = useState(false);
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [isSuperPlayer, setIsSuperPlayer] = useState<boolean>(false);
  const [totalPlays, setTotalPlays] = useState<number>(0);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [superPlayerRecords, setSuperPlayerRecords] = useState<SuperPlayerRecord[]>([]);  
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [globalRecord, setGlobalRecord] = useState<SuperPlayerRecord | null>(null);
     
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
    const entries = loadProgress();
    setProgressEntries(entries);
    const summary = getProgressSummary(entries);
    setProgressSummary(summary);
    setCurrentProgress(summary.recentScore);
    setIsFlashing(summary.recentScore >= 4);
    setIsSuperPlayer(entries.length >= 12);
    setTotalPlays(entries.length);
  }, []);

  
  // Função para buscar o recorde global
  const fetchGlobalRecord = async () => {
    try {
      const response = await fetch('/api/super-players?global=true');
      const data = await response.json();
      if (data.success) {
        setGlobalRecord(data.data);
      } else {
        console.error("Erro ao buscar recorde global:", data.error);
      }
    } catch (error) {
      console.error("Erro ao buscar recorde global:", error);
    }
  };
  
  
  useEffect(() => {
    if (progressEntries.length > 0) {
      const lastProgress = progressEntries[progressEntries.length - 1].score;
      setCurrentProgress(lastProgress);
      setIsFlashing(lastProgress === 4);
      setTotalPlays(progressEntries.length); // Atualiza o total de jogadas
      
      // Verifica se o usuário atual é super player (agora baseado no banco)
      if (session?.user?.name) {
        checkUserSuperPlayerStatus(session.user.name);
        
        // Salva no banco se atingiu 12+ jogadas
        if (progressEntries.length >= 12) {
          saveSuperPlayerRecord(session.user.name, progressEntries.length);
        }
      }
    } else {
      setCurrentProgress(0);
      setIsFlashing(false);
      setTotalPlays(0);
    }
    fetchGlobalRecord();
    fetchSuperPlayerRecords(); // Busca as conquistas ao carregar ou atualizar o progresso
  }, [progressEntries, session?.user?.name]);

                          
  const handleMouseEnter = () => {
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
    setIsLogoutVisible(true);
  };

  
  const handleClearProgress = () => {
    clearStoredProgress();
    setProgressEntries([]);
    const summary = getProgressSummary([]);
    setProgressSummary(summary);
    setCurrentProgress(0);
    setIsFlashing(false);
    setIsSuperPlayer(false);
    setTotalPlays(0);
  };

  const bestRound = progressEntries.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), { round: 0, score: 0 })

  const progressPercentage = (currentProgress / 4) * 100;


  // Função para verificar se o usuário é Super Player
  const checkUserSuperPlayerStatus = async (username: string) => {
    try {
      const response = await fetch(`/api/super-players?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (data.success) {
        setIsSuperPlayer(data.isSuperPlayer);
        // Opcional: você pode armazenar o record específico do usuário se quiser
      if (data.userRecord) {
        console.log("Record do usuário:", data.userRecord);
      }
    } else {
      console.error("Erro ao verificar status:", data.error);
      setIsSuperPlayer(false);
    
      }
    } catch (error) {
      console.error("Erro ao verificar status de Super Player:", error);
      setIsSuperPlayer(false);
    }
  };

  // UseEffect para verificar o status quando o usuário mudar
  useEffect(() => {
    if (session?.user?.name) {
      checkUserSuperPlayerStatus(session.user.name);
    } else {
      setIsSuperPlayer(false);
    }
  }, [session?.user?.name]);


  // Função para salvar a conquista no MongoDB
  const saveSuperPlayerRecord = async (username: string, totalPlays: number) => {
    try {
      const response = await fetch('/api/super-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, totalPlays }),
      });

      const result = await response.json();
    
      if (result.success) {
        // Atualiza o estado localmente
        setIsSuperPlayer(true);
        // Recarrega os registros e verifica o status novamente para garantir sincronização
        fetchSuperPlayerRecords();
        checkUserSuperPlayerStatus(username);
      } else {
        console.error("Erro ao salvar conquista:", result.error);
      }
    } catch (error) {
      console.error("Erro ao salvar a conquista:", error);
    }
  };


  // Função para buscar as conquistas do MongoDB
  const fetchSuperPlayerRecords = async () => {
    try {
      const response = await fetch('/api/super-players');
      const data = await response.json();
      if (data.success) {
        setSuperPlayerRecords(data.data as SuperPlayerRecord[]);
      } else {
        console.error("Erro ao buscar as conquistas:", data.error);
      }
    } catch (error) {
      console.error("Erro ao buscar as conquistas:", error);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header com perfil */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/game')} 
          className="absolute flex border text-gray-300 border-blue items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 mt-50 cursor-pointer">
          <ChevronLeft className="mr-2" color="blue" /> Voltar ao jogo
        </button>
        
      </div>      
           
      
      <h1 className="text-3xl font-semibold text-gray-300 mt-40 mb-4 text-center">Seu Progresso</h1>
      
      {globalRecord && (
        <div className="relative flex justify-center items-center mb-16 mt-8">
          <FaCrown className="text-yellow text-4xl animate-pulse" />
          <span className="absolute top-full mt-1 text-sm text-yellow-400 font-semibold animate-fade-in">
            <span className='text-green'>{globalRecord.username}:</span> Maior pontuação com <span className='text-yellow'>{globalRecord.totalPlays}</span> acertos!
          </span>
        </div>
      )}

      {isSuperPlayer && session?.user?.name && globalRecord && globalRecord.username !== session.user.name && (
        <div className="text-center mb-4">
          <span className="text-sm text-blue-400">
            Seu recorde: <span className="font-semibold">{totalPlays}</span> acertos
          </span>
        </div>
      )}

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

      {progressEntries.length === 0 ? (
        <p className="text-center text-gray-400">Você ainda não fez nenhuma jogada.</p>
      ) : (
        <>
          <div className="max-w-md max-h-48 overflow-y-auto mx-auto space-y-4 mb-8">
            {progressEntries.map((p, i) => (
              <div
              key={i}
              className={`bg-white text-black p-4 rounded-xl shadow-md flex justify-between items-center ${
                p.score === bestRound.score ? 'border-2 border-green ' : ''
              }`}
            >
              {/* Foto do usuário */}
              <img
                src={session?.user?.image || '/default-avatar.png'} // fallback se não houver imagem
                alt={session?.user?.name || 'Avatar'}
                className="w-6 h-6 rounded-full border-2 border-green object-cover"
              />
              {/* Conteúdo da jogada */}
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold ml-2">Jogada {p.round}</span>
                <span>
                  {p.score} acertos
                  {p.score === 4 && (
                    <FaMedal color="gold" className="inline-block ml-2 medalha-brilho-ouro" />
                  )}
                  {p.score === 3 && (
                    <FaMedal color="silver" className="inline-block ml-2 medalha-brilho-prata" />
                  )}
                </span>
              </div>
            </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
              <button
                onClick={handleClearProgress}
                className="flex items-center border border-red bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 cursor-pointer"
              >
                <Trash className="mr-2" color="red" /> Limpar Jogadas
              </button>
          </div>

          <h2 className="text-2xl font-semibold text-center text-gray-300 flex items-center justify-center gap-2 mb-6">
            Estatísticas de Acertos
          </h2>

          <div className="h-80 w-full max-w-4xl mx-auto rounded-2xl bg-white shadow-xl p-4 dark:bg-zinc-900 dark:shadow-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressEntries}>
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
                  dataKey="score"
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
            🏆 Melhor desempenho: <strong className="text-green dark:text-blue">{bestRound.score}</strong> acertos na jogada <strong className='text-green'>{bestRound.round}</strong>
          </div>
        </>
      )}
    
    
      {/* Exibição das Conquistas de Super Jogador */}
      {superPlayerRecords.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-center text-gray-300 mb-4">Maiores pontuações acumuladas</h2>
          <div className="max-h-32 overflow-y-auto"> {/* Adicionamos esta div com altura máxima e overflow */}
            <ul className="max-w-md mx-auto space-y-2">
              {superPlayerRecords.map((record, index) => (
                <li
                  key={index}
                  className="bg-zinc-800 rounded-md p-3 flex items-center justify-between shadow-md"
                >
                  <span className="font-semibold text-yellow">{record.username.length > 20 ? record.username.substring(0, 17) + '...': record.username}</span>
                  <span className="text-sm text-gray-400">{record.totalPlays} acertos</span>
                </li>
              ))}
                                      
            </ul>
          </div>
        </div>
      )}
    
    </div>
  )
}