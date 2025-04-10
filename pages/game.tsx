import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X } from 'lucide-react'
import { motion , AnimatePresence} from 'framer-motion'
import { saveProgress } from './results'
import { LockClosedIcon } from '@heroicons/react/24/solid';

//import successSound from '/sounds/success.mp3';

const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

type Result = {
  correct: boolean
  selected: string
}

const lockMessageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.1 } },
};

export default function Game() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const [showRestart, setShowRestart] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)

  const [theme, setTheme] = useState('')
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [results, setResults] = useState<Record<number, Result>>({});
  const [round, setRound] = useState(1);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)
  const [wrongSound, setWrongSound] = useState<HTMLAudioElement | null>(null)

  const [isFrasesUnlocked, setIsFrasesUnlocked] = useState(false);
  const [showLockMessage, setShowLockMessage] = useState(false);

  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCorrectSound(new Audio('/sounds/correct.mp3'))
      setWrongSound(new Audio('/sounds/wrong.mp3'))
      setSuccessSound(new Audio('/sounds/success.mp3'));
    }
  }, [])
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

  useEffect(() => {
    if (theme) loadImages()
  }, [theme, round])

  useEffect(() => {
    if (correctAnswersCount >= 1) {
      setIsFrasesUnlocked(true);
    }
  }, [correctAnswersCount]);
  
  const handleMouseEnter = () => {
    clearTimeout(logoutTimeoutId as NodeJS.Timeout); // Limpa qualquer timeout pendente
    setIsLogoutVisible(true);
  };

  const handleMouseLeave = () => {
    // Define um timeout para esconder o logout após um pequeno atraso
    const timeoutId = setTimeout(() => {
      setIsLogoutVisible(false);
    }, 300); // Ajuste o valor do atraso (em milissegundos) conforme necessário
    setLogoutTimeoutId(timeoutId);
  };

  const handleLogoutMouseEnter = () => {
    // Se o mouse entrar no botão de logout, cancela o timeout de desaparecimento
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
  };

  const loadImages = async () => {
    setLoading(true)
    setResults({})
    
    try {
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Erro da API:', errorText)
        throw new Error('Erro ao carregar imagens.');
      }
  
      const data = await res.json();
      console.log('🔁 Dados recebidos:', data); // <-- Adicione isso para depuração
  
      setImages(data);
    } catch (error) {
      console.error('❌ Erro ao carregar imagens:', error);
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = (index: number, userAnswer: string) => {
    const correct = images[index].title.toLowerCase() === userAnswer.toLowerCase()
    const alreadyCorrect = results[index]?.correct
  
    if (correct && !alreadyCorrect && correctSound) correctSound.play()
    if (!correct && wrongSound) wrongSound.play()

    const newResults = {
      ...results,
      [index]: { correct, selected: userAnswer }
    }  

    setResults(newResults)
      
    //const correctCount = Object.values(newResults).filter(r => r?.correct).length
    const currentCorrectCount = Object.values(newResults).filter((r) => r?.correct).length;
    setCorrectAnswersCount(currentCorrectCount);
    const totalCount = images.length
    const hasWrong = Object.values(newResults).some(r => r && !r.correct)

    //saveProgress(correctCount);

    saveProgress(currentCorrectCount);

    // Se errou alguma imagem, mostra botão para recomeçar
    if (hasWrong) {
      setShowRestart(true)
    }

    if (currentCorrectCount === totalCount) {
      setShowCongrats(true)
      
      // Salvar progresso no localStorage
      const prevProgress = JSON.parse(localStorage.getItem('progress') || '[]')
      localStorage.setItem('progress', JSON.stringify([...prevProgress, { round, correct: currentCorrectCount }]))
        
      setTimeout(() => {
        const nextTheme = themes.filter(t => t !== theme)[Math.floor(Math.random() * (themes.length - 1))]
        setTheme(nextTheme)
        setRound(r => r + 1)
        setShowCongrats(false)
      }, 3000);

      if (successSound) {
        successSound.play();
      }
    }
  };


  const handleFrasesClick = () => {
    if (isFrasesUnlocked) {
      router.push('/frases');
    } else {
      setShowLockMessage(true);
      setTimeout(() => {
        setShowLockMessage(false);
      }, 2000); // A mensagem desaparece após 2 segundos
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
      {session?.user && (
        <div 
          className="fixed top-4 right-4 z-50 group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2 cursor-pointer mt-4">
            <span className="text-white font-medium hidden sm:inline">{session.user.name}</span>
            <img src={session.user.image || ''} alt="Avatar" className="w-10 h-10 rounded-full border border-white" />
          </div>
          <div
            className={`absolute border border-blue right-0 mt-2 text-black py-2 px-4 rounded shadow-lg z-10 ${
              isLogoutVisible ? 'block' : 'hidden'
            }`}
            onMouseEnter={handleLogoutMouseEnter} // Impede o desaparecimento ao entrar no botão
          >
            <button onClick={() => signOut()} className="hover:text-red-600 cursor-pointer">Logout</button>
          </div>
          {/* Adicionando um pequeno "espaço invisível" para manter o hover ativo */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none group-hover:block"></div>
        </div>
      )}

      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold mb-8 mt-26 text-center drop-shadow-md"
      >
        🎮 Jogo para treinar o Francês
      </motion.h1>

      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={() => router.push('/results')}
          className="w-64 border border-blue bg-gradient-to-br text-blue from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 text-lg cursor-pointer"
        >
          Ver Progresso
        </button>

        <select
          onChange={e => setTheme(e.target.value)}
          className="w-64 bg-gradient-to-br border border-blue text-blue font-semibold py-3 px-6 rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-lg cursor-pointer **text-center**"
          value={theme}
        >
          <option value="">Escolha uma opção</option>
          {themes.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        {/* Botão "Frases em Francês" */}
        <div className="w-64 flex flex-col items-center">
          {!isFrasesUnlocked && (
            <p className="text-sm text-gray-400 mb-1 text-center">Completa 1 acerto para desbloquear este nível.</p>
          )}
          <button
            className={`flex items-center justify-center py-3 px-6 rounded-md font-semibold transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 ${
              isFrasesUnlocked
                ? 'bg-blue hover:bg-green cursor-pointer text-white shadow-md'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-sm'
            }`}
            onClick={handleFrasesClick}
            disabled={!isFrasesUnlocked}
          >
            {!isFrasesUnlocked && <LockClosedIcon className="w-5 h-5 mr-2 " />}
            Frases em Francês
          </button>

          {/* Mensagem de bloqueio */}
          <AnimatePresence>
            {showLockMessage && !isFrasesUnlocked && (
              <motion.div
                className="absolute bottom-[-30px] text-sm text-yellow-400 font-semibold"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={lockMessageVariants}
              >
                Nível bloqueado!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showRestart && (
          <button
            onClick={() => {
              setRound(r => r + 1)
              setShowRestart(false)
            }}
            className="mt-6 border border-red text-red-500 bg-transparent hover:bg-red-600 hover:text-white px-4 py-2 rounded shadow transition cursor-pointer"
          >
            ❌ Jogue de novo
          </button>
        )}

      </div>

      {theme && <h2 className="text-2xl font-semibold mt-4 mb-6 text-center">Tema: {theme}</h2>}

      {loading ? (
        <div className="text-center text-lg animate-pulse">🔍 Procurando imagens...</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl mt-6">
          {images.map((img, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-transparent text-black p-4 rounded-2xl shadow-2xl w-[280px] transition transform hover:scale-105"
            >
              <img src={img.url} alt="imagem" className="w-full h-48 object-cover rounded-xl" />
              <div className="mt-2">Escolha o título correto:</div>
              <select
                className="w-full mt-1 p-2 rounded border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                onChange={e => checkAnswer(index, e.target.value)}
                disabled={!!results[index]}
              >
                <option value="">Selecione</option>
                {img.options.map((opt: string, i: number) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>

              {results[index] && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mt-2 flex items-center"
                >
                  {results[index].correct ? (
                    <>
                      <Check className="mr-2" color="green" />
                      <span className="font-medium" color="green">Correto!</span>
                    </>
                  ) : (
                    <>
                      <X className="mr-2" color="red"/>
                      <span className="font-medium" color="red">Errado. Resposta: {img.title}</span>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {showCongrats && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 backdrop-blur-md" // Adicionado backdrop-blur-md para o efeito de sobreamento
        >
          <motion.div
            className="bg-white text-black rounded-2xl p-8 shadow-2xl text-center text-3xl font-bold animate-pulse"
            style={{
              boxShadow: '0 0 20px rgba(255, 255, 0, 0.8)', // Adicionado brilho amarelo
              textShadow: '0 0 10px rgba(255, 255, 0, 0.8)', // Adicionado brilho no texto
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            onAnimationComplete={() => {
              if (successSound) {
                successSound.play();
              }
            }}
          >
            🎉 Parabéns! Você acertou tudo!
          </motion.div>
        </motion.div>
      )}

    </div>
  )
}
