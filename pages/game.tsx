/*'use client'*/

import { useEffect, useRef, useState } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X } from 'lucide-react'
import { motion , AnimatePresence} from 'framer-motion'
import { saveProgress } from './results'
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { io } from 'socket.io-client'

//import successSound from '/sounds/success.mp3';

const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

const animalSounds: Record<string, string> = {
  'Chien': '/sounds/cachorro.mp3',
  'Chat': '/sounds/gato.mp3',
  'Éléphant': '/sounds/elefante.mp3',
  'Lion': '/sounds/lion.mp3',
  'Poisson': '/sounds/fish.mp3',
  'Requin': '/sounds/fish.mp3',
  'Serpent': '/sounds/snake.mp3',
  'Ours': '/sounds/bear.mp3',
  'Cheval': '/sounds/horse.mp3',
  'Perroquet': '/sounds/parrot.mp3',
  'Oiseau': '/sounds/bird.mp3',
  'Crocodile': '/sounds/alligator.mp3',
  'Gorille': '/sounds/gorila.mp3',
  'Mouton': '/sounds/sheep.mp3',
  'Canard': '/sounds/duck.mp3',
}

type Result = {
  correct_word: boolean
  selected: string
}

type Player = {
  clientId: string
  name: string
}

type ShowNotification = {
  name: string
  type: 'join' | 'leave'
} | null

const lockMessageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.1 } },
};

export default function Game() {
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const [showRestart, setShowRestart] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  
  const [theme, setTheme] = useState('')
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  //const [results, setResults] = useState<Record<number, Result>>({});
  const [results, setResults] = useState<(Result | null)[]>([]);


  const [round, setRound] = useState(1);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)
  const [wrongSound, setWrongSound] = useState<HTMLAudioElement | null>(null)

  const [isFrasesUnlocked, setIsFrasesUnlocked] = useState(false);
  const [showLockMessage, setShowLockMessage] = useState(false);

  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);

  const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)

  
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
    if (!showCongrats && images.length > 0) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500); // Pequeno delay para garantir que novas imagens renderizem
    }
  }, [showCongrats, images]);
  

  useEffect(() => {
    if (correctAnswersCount >= 1) {
      setIsFrasesUnlocked(true);
    }
  }, [correctAnswersCount]);

  
  /*useEffect(() => {
    const socket = io({
      path: '/api/socketio',
    })

    if (session?.user?.name) {
      socket.emit('userJoined', session.user.name)
    }

    socket.on('userJoined', (name: string) => {
      if (name !== session?.user?.name) {
        setShowNotification({ name })
        setTimeout(() => setShowNotification(null), 4000)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [session?.user?.name])*/

  
  useEffect(() => {
    if (!session) return
  
    const clientId = session.user?.email || Math.random().toString(36).substring(2, 9)
    const client = createAblyClient(clientId)
    setAblyClient(client)
  
    return () => {
      client.close()
    }
  }, [session])


  useEffect(() => {
    if (!ablyClient || !session) return
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const clientId = ablyClient.auth.clientId!
  
    const onConnected = () => {
      presenceChannel.presence.enter({ name })
  
      // Atualiza lista de quem está online
      const syncPresence = async () => {
        const members = await presenceChannel.presence.get()
        const players = members.map((member: any) => ({
          name: member.data.name,
          clientId: member.clientId,
        }))
        setPlayersOnline(players)
      }
  
      // ▶️ Quando alguém entra
      presenceChannel.presence.subscribe('enter', (member: any) => {
        const newPlayer = { name: member.data.name, clientId: member.clientId }
        if (member.clientId !== clientId) {
          setShowNotification({ name: newPlayer.name, type: 'join' })
          setTimeout(() => setShowNotification(null), 6000)
        }
        syncPresence()
      })
  
      // ⚡ Quando alguém sai
      presenceChannel.presence.subscribe('leave', (member: any) => {
        const leavingPlayer = { name: member.data.name, clientId: member.clientId }
  
        if (leavingPlayer.clientId !== clientId) {
          setShowNotification({ name: leavingPlayer.name, type: 'leave' })
          setTimeout(() => setShowNotification(null), 6000)
        }
  
        syncPresence()
      })
    
      syncPresence()
    
    }
  
    // Garante que o client está conectado
    ablyClient.connection.once('connected', onConnected)
  
    return () => {
      if (ablyClient.connection.state === 'connected') {
        presenceChannel.presence.leave()
      }
    
      presenceChannel.presence.unsubscribe()
      ablyClient.connection.off('connected', onConnected)
    }
  }, [ablyClient, session])
  
  
  
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
    setResults([]);
    
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
      imageRefs.current = []; // limpa os refs antigos
      setResults(Array(data.length).fill(null));
    } catch (error) {
      console.error('❌ Erro ao carregar imagens:', error);
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = (index: number, userAnswer: string) => {
    playAnimalSound(images[index].title)
    
    const correct_word = images[index].title.toLowerCase() === userAnswer.toLowerCase()
    const alreadyCorrect = results[index]?.correct_word
    
    if (correct_word && !alreadyCorrect && correctSound) correctSound.play()
    if (!correct_word && wrongSound) wrongSound.play()

    /*const newResults = {
      ...results,
      [index]: { correct, selected: userAnswer }
    }*/
   
    const newResults = [...results]; // agora é um array!
    newResults[index] = { correct_word, selected: userAnswer };  

    setResults(newResults);
      
    
    // ⏬ Scroll para a próxima imagem ainda não respondida (com pequeno delay)
    setTimeout(() => {
      const nextUnansweredIndex = newResults.findIndex((res, i) => !res && i > index)
      const nextRef = imageRefs.current[nextUnansweredIndex]
      if (nextUnansweredIndex !== -1 && nextRef) {
        nextRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)
    
    // Scroll para a próxima imagem ainda não respondida
    /*const nextUnansweredIndex = newResults.findIndex((res, i) => !res && i > index);
    if (nextUnansweredIndex !== -1 && imageRefs.current[nextUnansweredIndex]) {
      imageRefs.current[nextUnansweredIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }*/

    //const correctCount = Object.values(newResults).filter(r => r?.correct).length
    const currentCorrectCount = Object.values(newResults).filter((r) => r?.correct_word).length;
    setCorrectAnswersCount(currentCorrectCount);
    const totalCount = images.length
    const hasWrong = Object.values(newResults).some(r => r && !r.correct_word)

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

  const playAnimalSound = (title: string) => {
    if (theme !== 'animais') return; // só toca se for o tema "animais"
    const soundPath = animalSounds[title]
    if (soundPath) {
      const audio = new Audio(soundPath)
      audio.play().catch(err => console.error('Erro ao tocar som do animal:', err))
    }
  }
  

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

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-xl z-50"
          >
          {showNotification.type === 'join' ? (
            <>🎮 {showNotification.name} entrou no jogo!</>
          ) : (
            <>⚡ {showNotification.name} saiu do jogo.</>
          )}
          </motion.div>
        )}
      </AnimatePresence>
      
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
            <p className="text-sm text-gray-400 mb-1 text-center">Selecione uma opção e complete 1 acerto para desbloquear este nível.</p>
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

      {theme && <h2 className="text-2xl font-semibold mt-4 mb-6 text-center">Opção: {theme}</h2>}

      {loading ? (
        <div className="text-center text-lg animate-pulse">🔍 Procurando imagens...</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl mt-6">
          {images.map((img, index) => (
            <motion.div 
              key={index}
              ref={(el) => {
                if (el) imageRefs.current[index] = el;
              }} 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-transparent text-black p-4 rounded-2xl flex-grow shadow-2xl max-w-[280px] transition transform hover:scale-105"
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
                  {results[index].correct_word ? (
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
