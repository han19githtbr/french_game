import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
//import { Button } from '@/components/ui/button'
import { Check, X, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { saveProgress } from './phrases_results'


const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

const animalSounds: Record<string, string> = {
  'Chien': '/sounds/cachorro.mp3',
  'Chat': '/sounds/gato.mp3',
  'Eléphant': '/sounds/elefante.mp3',
  'Lion': '/sounds/lion.mp3',
  'Poisson': '/sounds/fish.mp3',
  'Requin': '/sounds/fish.mp3',
  'Serpent': '/sounds/snake.mp3',
  'Ours': '/sounds/bear.mp3',
  'Cheval': '/sounds/horse.mp3',
  'Perroquet': '/sounds/parrot.mp3',
  'Oiseau': '/sounds/bird.mp3',
}

type Result = {
  correct_phrase: boolean
  selected: string
}

const lockMessageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.1 } },
};

export default function Frase() {
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

  const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)
  const [wrongSound, setWrongSound] = useState<HTMLAudioElement | null>(null)
  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCorrectSound(new Audio('/sounds/correct.mp3'));
      setWrongSound(new Audio('/sounds/wrong.mp3'));
      setSuccessSound(new Audio('/sounds/success.mp3'));
    }
  }, [])
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

  useEffect(() => {
    if (theme) loadImages()
  }, [theme, round])

  
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
      const res = await fetch('/api/generate-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Erro da API:', errorText)
        throw new Error('Erro ao carregar imagens.')
      }
  
      const data = await res.json()
      console.log('🔁 Dados recebidos:', data) // <-- Adicione isso para depuração
  
      setImages(data)
    } catch (error) {
      console.error('❌ Erro ao carregar imagens:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = (index: number, userAnswer: string) => {
    playAnimalSound(images[index].title)
    
    const correct_phrase = images[index].title.toLowerCase() === userAnswer.toLowerCase()
    const alreadyCorrect = results[index]?.correct_phrase
  
    if (correct_phrase && !alreadyCorrect && correctSound) correctSound.play()
    if (!correct_phrase && wrongSound) wrongSound.play()

    const newResults = {
      ...results,
      [index]: { correct_phrase, selected: userAnswer }
    }  

    setResults(newResults)
      
    const correctCount = Object.values(newResults).filter(r => r?.correct_phrase).length
    const totalCount = images.length
    const hasWrong = Object.values(newResults).some(r => r && !r.correct_phrase)

    saveProgress(correctCount)

    // Se errou alguma imagem, mostra botão para recomeçar
    if (hasWrong) {
      setShowRestart(true)
    }

    if (correctCount === totalCount) {
      setShowCongrats(true)
      
      // Salvar progresso no localStorage
      const prevProgress = JSON.parse(localStorage.getItem('progress_phrases') || '[]')
      localStorage.setItem('progress_phrases', JSON.stringify([...prevProgress, { round, correct_phrase: correctCount }]))
        
      setTimeout(() => {
        const nextTheme = themes.filter(t => t !== theme)[Math.floor(Math.random() * (themes.length - 1))]
        setTheme(nextTheme)
        setRound(r => r + 1)
        setShowCongrats(false)
      }, 3000)
    
      if (successSound) {
        successSound.play();
      }
    
    }
  }
  
  const playAnimalSound = (title: string) => {
    if (theme !== 'animais') return; // só toca se for o tema "animais"
    const soundPath = animalSounds[title]
    if (soundPath) {
      const audio = new Audio(soundPath)
      audio.play().catch(err => console.error('Erro ao tocar som do animal:', err))
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
      <div className="fixed top-8 left-4 z-50">
        <button
            onClick={() => router.push('/game')}
            className="flex border border-blue bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 cursor-pointer"
        >
            <ChevronLeft className="mr-2" color="blue" /> Voltar para tela principal
        </button>
      </div>
      {session?.user && (
        <div 
          className="fixed top-4 right-4 z-50 group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2 cursor-pointer mt-4 mr-2">
            <span className="text-white font-medium hidden sm:inline">{session.user.name}</span>
            <img src={session.user.image || ''} alt="Avatar" className="w-8 h-8 rounded-full border border-white" />
          </div>
          <div
            className={`absolute border border-blue right-0 mt-2 text-black py-2 px-4 rounded shadow-lg z-10 ${
              isLogoutVisible ? 'block' : 'hidden'
            }`}
            onMouseEnter={handleLogoutMouseEnter} // Impede o desaparecimento ao entrar no botão
          >
            <button onClick={() => signOut()} className="hover:text-red-600 cursor-pointer">Logout</button>
          </div>
          
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none group-hover:block"></div>
        </div>
      )}

      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold mb-8 mt-26 text-center drop-shadow-md"
      >
        🎮 Construa frases em Francês
      </motion.h1>

      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={() => router.push('/phrases_results')}
          className="w-64 border border-blue bg-gradient-to-br text-blue from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 text-lg cursor-pointer"
        >
          Ver Progresso
        </button>

        <select
          onChange={e => setTheme(e.target.value)}
          className="w-64 bg-gradient-to-br border border-blue text-blue font-semibold py-3 px-6 rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-lg cursor-pointer **text-center**"
          value={theme}
        >
          <option value="">Escolha um tema</option>
          {themes.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

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
              <div className="mt-2">Escolha a frase correta:</div>
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
                  {results[index].correct_phrase ? (
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