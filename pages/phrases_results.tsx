// pages/results.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
//import { signOut, useSession } from 'next-auth/react'

export default function ResultsPage() {
  const [progress_phrases, setProgressPhrases] = useState<{ round: number, correct_phrase: number }[]>([])
  //const { data: session } = useSession()
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

  /*const handleLogout = async () => {
    await signOut();
    
  };*/

  useEffect(() => {
    const saved = localStorage.getItem('progress_phrases')
    if (saved) {
      setProgressPhrases(JSON.parse(saved))
    }
  }, []);

  const clearProgress = () => {
    localStorage.removeItem('progress_phrases');
    setProgressPhrases([]);
  };

  const bestRound = progress_phrases.reduce((prev, curr) => (curr.correct_phrase > prev.correct_phrase ? curr : prev), { round: 0, correct_phrase: 0 })

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header com perfil */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/frases')} 
          className="fixed flex border border-blue items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 mt-10 cursor-pointer">
          <ChevronLeft className="mr-2" color="blue" /> Voltar ao jogo
        </button>
        {/**{session?.user && (
          <div
            className="fixed right-4 z-50"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center gap-2 cursor-pointer mt-16">
              <span className="text-white font-medium hidden sm:inline">{session.user.name}</span>
              <img src={session.user.image || ''} alt="Avatar" className="w-8 h-8 rounded-full border border-white" />
            </div>
            <div
              className={`absolute border border-blue right-0 mt-2 text-black py-2 px-4 rounded shadow-lg z-10 ${
                isLogoutVisible ? 'block' : 'hidden'
              }`}
              onMouseEnter={handleLogoutMouseEnter} // Impede o desaparecimento ao entrar no botão
            >
              <button onClick={handleLogout} className="hover:text-red-600 cursor-pointer">Logout</button>
            </div>
          </div>
        )}**/}
      </div>      
      
      <h1 className="text-3xl font-bold mt-30 mb-4 text-center">Seu Progresso</h1>
      
      {progress_phrases.length === 0 ? (
        <p className="text-center text-gray-400">Você ainda não fez nenhuma jogada.</p>
      ) : (
        <>
          <div className="max-w-md mx-auto space-y-4 mb-8">
            {progress_phrases.map((p, i) => (
              <div
                key={i}
                className={`bg-white text-black p-4 rounded-xl shadow-md flex justify-between items-center ${p.correct_phrase === bestRound.correct_phrase ? 'border-2 border-yellow-400' : ''}`}
              >
                <span>Jogada {p.round}</span>
                <span>{p.correct_phrase} acertos</span>
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
              <BarChart data={progress_phrases}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" label={{ value: 'Jogada', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Acertos', angle: -90, position: 'insideLeft' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="correct_phrase" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center mt-8 text-lg">
            🏆 Melhor desempenho: <strong>{bestRound.correct_phrase}</strong> acertos na jogada {bestRound.round}
          </div>
        </>

      )}
    </div>
  )
}


// Função para salvar progresso após cada rodada
export const saveProgress = (correct_phrase: number) => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('progress_phrases')
    const parsed = saved ? JSON.parse(saved) : []
    const round = parsed.length + 1
    parsed.push({ round, correct_phrase })
    localStorage.setItem('progress_phrases', JSON.stringify(parsed))
}