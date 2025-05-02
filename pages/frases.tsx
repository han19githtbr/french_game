import { useEffect, useRef, useState, RefObject, useCallback } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
//import { Button } from '@/components/ui/button'
import { Check, X, ChevronLeft, Minus, Lock } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, animate, MotionValue } from 'framer-motion'
import { saveProgress } from './sentences_results'
import { DotLoader } from 'react-spinners';
import { Realtime, Message } from 'ably'
import { useSound } from 'use-sound';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'


const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

const animalSounds: Record<string, string> = {
  'C\'est mon chien': '/sounds/cachorro.mp3',
  'Jean joue avec son chien': '/sounds/cachorro.mp3',
  'Ce chat, c\'est celui de Julien': '/sounds/gato.mp3',
  'Je n\'ai pas peur des éléphants': '/sounds/elefante.mp3',
  'Le lion est le roi de la jungle': '/sounds/lion.mp3',
  'Le poisson est riche en vitamines': '/sounds/fish.mp3',
  'J\'ai déjà vu un requin': '/sounds/fish.mp3',
  'Ce serpent est venimeux': '/sounds/snake.mp3',
  'L\'Ours est un animal sauvage': '/sounds/bear.mp3',
  'Ce cheval, c\'est celui de mon frère': '/sounds/horse.mp3',
  'Ce perroquet, c\'est celui de mon voisin': '/sounds/parrot.mp3',
  'Cet oiseau est très beau': '/sounds/bird.mp3',
  'Fais attention aux crocodiles!': '/sounds/alligator.mp3',
  'Ce gorille est très docile': '/sounds/gorila.mp3',
  'Ce mouton a perdu sa troupe': '/sounds/sheep.mp3',
  'Ce canard est celui de ma tante!': '/sounds/duck.mp3',
  'Je me suis réveillé au chant de ce coq!': '/sounds/clucking.mp3'
}

type Result = {
  correct_answer: boolean
  selected: string
}

type Player = {
  clientId: string
  name: string
}

type ShowNotification =
  | {
      name: string;
      type: 'join' | 'leave';
    }
  | null;

type ChatRequest = {
  fromClientId: string;
  fromName: string;
};

type ChatMessage = {
  sender: string;
  text: string;
  timestamp: number;
};

interface OnlineNotificationsProps {
  playersOnline: Player[];
  handleRequestChat: (player: Player) => void;
  openChatBubble: (player: Player) => void;
}

interface ReviewItem {
  url: string;
  title: string;
}

type SetterFunction = (value: boolean) => void;

const lockMessageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

const unlockButtonVariants = {
  locked: {},
  unlocking: {
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: { duration: 0.2 },
  },
  unlocked: {},
};

const unlockAnimationVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
};

//const frenchVoices = ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU'];

export default function Frase() {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastSpokenTitleRef = useRef<string | null>(null);
  
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
  const [speechSpeeds, setSpeechSpeeds] = useState<number[]>(images.map(() => 1.0));

  const [round, setRound] = useState(1);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)
  const [wrongSound, setWrongSound] = useState<HTMLAudioElement | null>(null)
  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);
  const [playUnlockSound] = useSound('/sounds/unlock.mp3');
  const [showLockMessage, setShowLockMessage] = useState(false);

  //const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  //const [chatPartnerAvatar, setChatPartnerAvatar] = useState('');
  //const [hiddenPlayers, setHiddenPlayers] = useState<string[]>([]);
  
  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  //const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  //const [clientId, setClientId] = useState<string | null>(null);

  //const [chatRequestsReceived, setChatRequestsReceived] = useState<ChatRequest[]>([]);
  //const [chatRequestsSent, setChatRequestsSent] = useState<{ toClientId: string, toName: string }[]>([]);
  
  //const [activeChats, setActiveChats] = useState<{ [clientId: string]: ChatMessage[] }>({});
  //const [isChatBubbleOpen, setIsChatBubbleOpen] = useState<string | false>(false);
  //const [chatInput, setChatInput] = useState('');
  //const [chatPartnerName, setChatPartnerName] = useState<string | null>(null);
  //const [isTyping, setIsTyping] = useState(false);
  //const typingHandlersRef = useRef<Record<string, (msg: Ably.Message) => void>>({});
  //const [typingIndicator, setTypingIndicator] = useState<{ [clientId: string]: boolean }>({});
  //const enterSoundRef = useRef<HTMLAudioElement | null>(null);
  //const chatRequestReceivedSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de pedido recebido
  //const chatRequestResponseSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de resposta ao pedido
  //const chatHandlersRef = useRef<Record<string, (message: Ably.Message) => void>>({});

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 }) // canto superior esquerdo
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 130, y: 130 });
  const [visibleModals, setVisibleModals] = useState<Record<string, boolean>>({});
  //const [minimizedRequests, setMinimizedRequests] = useState<string[]>([]);
  //const [minimizedChat, setMinimizedChat] = useState<string | false>(false);

  const [reviewHistory, setReviewHistory] = useState<ReviewItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [availableReviews, setAvailableReviews] = useState(0);
  const reviewIntervalRef: RefObject<ReturnType<typeof setInterval> | null> = useRef(null);
  
  const [isReviewUnlocking, setIsReviewUnlocking] = useState(false);
  const [isReviewUnlocked, setIsReviewUnlocked] = useState(false);
  const [showUnlockReviewAnimation, setShowUnlockReviewAnimation] = useState(false);
  const lockRotation = useMotionValue(0);
  const lockY = useMotionValue(0);

  const [isFlashing, setIsFlashing] = useState(false); // Estado para controlar a animação de piscar
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  //const [newPlayerAlert, setNewPlayerAlert] = useState('');
  const alertTimeout = useRef<NodeJS.Timeout | null>(null);
  

  const [open, setOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  //const clientId = ablyClient?.auth.clientId;
  //const playerName = session?.user?.name || 'Anônimo';

  const handleUnlockAnimationEnd = (setter: SetterFunction) => {
    setTimeout(() => {
      setter(false);
    }, 4000); // Mantém a animação por 4 segundos
  };

  
  const showToast = (message: string, type: 'info' | 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Exibir por 3 segundos
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCorrectSound(new Audio('/sounds/correct.mp3'));
      setWrongSound(new Audio('/sounds/wrong.mp3'));
      setSuccessSound(new Audio('/sounds/success.mp3'));
    }
  }, [])
  

  // Adicionar voz ao review
  useEffect(() => {
    const currentReview = reviewHistory[currentReviewIndex];
    const currentSpeed = speechSpeeds?.[currentReviewIndex] ?? 1;
  
    if (
      showReviewModal && // <- verifica se o modal está aberto
      currentReview &&
      currentReview.title !== lastSpokenTitleRef.current
    ) {
      speakFrench(currentReview.title, currentSpeed);
      lastSpokenTitleRef.current = currentReview.title;
    }
  }, [currentReviewIndex, reviewHistory, speechSpeeds, showReviewModal]);


  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => setDragging(false);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    
    const handleTouchEnd = () => setDragging(false);
    const handleTouchCancel = () => setDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [dragging, offset]);

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging || !boxRef.current) return;

    const newX = clientX - offset.x;
    const newY = clientY - offset.y;

    const box = boxRef.current;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const boxWidth = box.offsetWidth;
    const boxHeight = box.offsetHeight;

    const clampedX = Math.max(0, Math.min(newX, windowWidth - boxWidth));
    const clampedY = Math.max(0, Math.min(newY, windowHeight - boxHeight));

    setPosition({ x: clampedX, y: clampedY });
  };
   

  const handleStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!boxRef.current) return;
    setDragging(true);
    let clientX: number | undefined;
    let clientY: number | undefined;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e instanceof TouchEvent && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    if (clientX !== undefined && clientY !== undefined) {
      setOffset({
        x: clientX - boxRef.current.offsetLeft,
        y: clientY - boxRef.current.offsetTop,
      });
    }
  };

  useEffect(() => {
    if (theme) loadImages()
  }, [theme, round])


  useEffect(() => {
    const correctAnswersInRound = results.filter(res => res?.correct_answer);
    if (correctAnswersInRound.length > 0 && results.length === images.length) {
      setAvailableReviews(prev => prev + 1);
    }
  }, [results, images.length]);

  // Efeito para iniciar e parar a animação de piscar quando availableReviews muda
  useEffect(() => {
    if (availableReviews > 0) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 500); // Duração do efeito de piscar (ajuste conforme necessário)
      return () => clearTimeout(timer);
    } else {
      setIsFlashing(false);
    }
  }, [availableReviews]);
  

  useEffect(() => {
    if (!showCongrats && images.length > 0) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500); // Pequeno delay para garantir que novas imagens renderizem
    }
  }, [showCongrats, images]);


  useEffect(() => {
    if (correctAnswersCount >= 4) { // Defina a condição para desbloquear a revisão (ex: 3 acertos)
      if (!isReviewUnlocked) {
        setIsReviewUnlocking(true);
        setShowUnlockReviewAnimation(true);
        animate(lockRotation, 45, { duration: 0.4, ease: "easeInOut" }); // Rotação para destravar
        animate(lockY, -5 as MotionValue<number>["current"], { duration: 0.2, repeat: 3, repeatType: 'mirror', ease: "easeInOut" }); // Pequena trepidação vertical
        
        // Reproduzir o som de desbloqueio
        playUnlockSound();
        
        setTimeout(() => {
          setIsReviewUnlocked(true);
          setIsReviewUnlocking(false);
          handleUnlockAnimationEnd(setShowUnlockReviewAnimation);
        }, 1000);
      }
    }
  }, [correctAnswersCount, isReviewUnlocked, lockRotation, lockY, playUnlockSound]);

  /*useEffect(() => {
    if (!session) return
  
    const generatedClientId = session.user?.email || Math.random().toString(36).substring(2, 9)
    const client = createAblyClient(generatedClientId)
    setAblyClient(client);

    setClientId(generatedClientId);
  
    return () => {
      client.close()
    }
  }, [session]);*/


  
  // [ACRESCENTADO] Estado para armazenar o clientId assim que estiver disponível
  /*useEffect(() => {
    if (ablyClient) {
      setClientId(ablyClient.auth.clientId);
    }
  }, [ablyClient]);*/


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
    setResults([])
    
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
  
      setImages(data);
      imageRefs.current = []; // limpa os refs antigos
      setResults(Array(data.length).fill(null));
    } catch (error) {
      console.error('❌ Erro ao carregar imagens:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = (index: number, userAnswer: string) => {
    playAnimalSound(images[index].title)
    
    const correct_answer = images[index].title.toLowerCase() === userAnswer.toLowerCase()
    const alreadyCorrect = results[index]?.correct_answer
  
    if (correct_answer && !alreadyCorrect && correctSound) correctSound.play()
    if (!correct_answer && wrongSound) wrongSound.play()

    const newResults = [...results]; // agora é um array!
    newResults[index] = { correct_answer, selected: userAnswer };    

    setResults(newResults);

    // ⏬ Scroll para a próxima imagem ainda não respondida (com pequeno delay)
    setTimeout(() => {
      const nextUnansweredIndex = newResults.findIndex((res, i) => !res && i > index)
      const nextRef = imageRefs.current[nextUnansweredIndex]
      if (nextUnansweredIndex !== -1 && nextRef) {
        nextRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)
      

    const currentCorrectCount = Object.values(newResults).filter((r) => r?.correct_answer).length;
    setCorrectAnswersCount(currentCorrectCount);
    const totalCount = images.length
    const hasWrong = Object.values(newResults).some(r => r && !r.correct_answer)

    saveProgress(currentCorrectCount)

    // Se errou alguma imagem, mostra botão para recomeçar
    if (hasWrong) {
      setShowRestart(true)
    }

    if (currentCorrectCount === totalCount) {
      setShowCongrats(true)
      
      // Salvar progresso no localStorage
      const prevProgress = JSON.parse(localStorage.getItem('progress_answers') || '[]')
      localStorage.setItem('progress_answers', JSON.stringify([...prevProgress, { round, correct_answer: currentCorrectCount }]))
        
      // Adiciona os acertos da rodada ao histórico de revisão
      const currentRoundCorrect = images.filter((_, i) => newResults[i]?.correct_answer).map(img => ({
        url: img.url,
        title: img.title,
      }));
      if (currentRoundCorrect.length > 0) {
        setReviewHistory(prev => [...prev, ...currentRoundCorrect]);
      }

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
    

  const handleOpenReview = () => {
    setShowReviewModal(true);
    setCurrentReviewIndex(0);
    startReviewVideo();
    setAvailableReviews(0); // Marca as revisões como assistidas
    setIsReviewPaused(false); // Inicializa como não pausado ao abrir
  };

  const handleCloseReview = () => {
    setShowReviewModal(false);
    stopReviewVideo();
    setIsReviewPaused(false); // Reseta o estado de pausa ao fechar
  };

  const startReviewVideo = () => {
    stopReviewVideo();
    reviewIntervalRef.current = setInterval(() => {
      setCurrentReviewIndex(prev => (prev + 1) % reviewHistory.length);
    }, 5000); // Ajuste a velocidade do "vídeo" aqui (ms)
    setIsReviewPaused(false); // Atualiza o estado para não pausado
  };

  const stopReviewVideo = () => {
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current);
      reviewIntervalRef.current = null;
      setIsReviewPaused(true); // Atualiza o estado para pausado
    }
  };

  const handlePauseResumeReview = () => {
    if (reviewIntervalRef.current) {
      stopReviewVideo();
    } else {
      startReviewVideo();
    }
  };

  const isReviewAvailable = availableReviews > 0;

  const speakFrench = (text: string, speed: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('A API de Text-to-Speech não é suportada neste navegador.');
      return;
    }
  
    const synth = window.speechSynthesis;
  
    const speak = () => {
      const voices = synth.getVoices();
      const frenchVoice = voices.find((voice) =>
        ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU'].includes(voice.lang)
      );
  
      const utterance = new SpeechSynthesisUtterance(text);
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      } else {
        console.warn('Voz em francês não encontrada. Usando a voz padrão.');
      }
  
      utterance.lang = 'fr-FR'; // força o idioma francês
      utterance.rate = speed;
      synth.speak(utterance);
    };
  
    if (synth.getVoices().length === 0) {
      // Chrome mobile geralmente precisa desse evento
      synth.addEventListener('voiceschanged', speak);
    } else {
      speak();
    }
  };
  
  const handleSpeedChange = (index: number, newSpeed: number) => {
    const newSpeeds = [...speechSpeeds];
    newSpeeds[index] = newSpeed;
    setSpeechSpeeds(newSpeeds);
  };

  useEffect(() => {
    if (images.length > 0) {
      setSpeechSpeeds(images.map(() => 1)); // Inicializa todas as velocidades como 1
    }
  }, [images]);

  const lockIconStyle = {
    rotate: lockRotation,
    y: lockY,
  };


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
      <div className="absolute top-76 left-4 z-50">
        <button
            onClick={() => router.push('/game')}
            className="flex border border-blue text-gray-300 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 cursor-pointer"
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
          <div className="flex items-center gap-2 cursor-pointer mt-6 mr-1">
            <span className="text-gray-300 font-medium hidden sm:inline">{session.user.name}</span>
            <img src={session.user.image || ''} alt="Avatar" className="w-10 h-10 rounded-full border border-green" />
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


      <div className="fixed top-4 left-4 z-50">
        
        {/* Sininho de Notificações */}
        <button
          
          className="relative border-2 border-lightblue hover:bg-lightblue text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer mt-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1h9v-1a6 6 0 01-12 0v-1c0-2.485-2.099-4.5-4-4s-4 2.015-4 4v1z" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
              {notificationCount}
            </span>
          )}
        </button>
      </div>
                
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-5 left-5 bg-gradient-to-r from-blue to-purple text-white px-6 py-3 rounded-2xl shadow-xl"
            style={{ zIndex: 9999 }}
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
        className="text-4xl text-gray-300 font-bold mb-8 mt-104 text-center drop-shadow-md"
      >
        🗨️ Construa frases em Francês
      </motion.h1>

      <div className="flex flex-col items-center space-y-6 mt-8">
        <button
            onClick={() => router.push('/sentences_results')}
            className="w-64 border-2 border-lightblue bg-gradient-to-br text-blue from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 text-lg cursor-pointer flex items-center justify-center space-x-3"
        >
          <div className="flex items-center">
            <svg
              className="animate-spin h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          </div>
          <span>Ver Progresso</span>
        </button>

        <div className="relative w-full">
          {/* Botão de abertura */}
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between py-3 px-6 rounded-xl border-2 border-lightblue bg-gradient-to-br from-purple-700 to-indigo-800 text-blue shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 text-lg tracking-wide font-semibold text-center cursor-pointer transition-all duration-300 ease-out"
          >
            {theme ? (
              `🎯 ${theme}`
            ) : (
              <span className="flex items-center gap-2">
                {/* Ícone Check animado */}
                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className="text-green"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <span>Escolha uma opção</span>
              </span>
            )}
            <span className="ml-2">▼</span>
          </button>
        
          {/* Lista de opções */}
          {open && (
            <ul className="absolute mt-2 w-full rounded-xl bg-gray-700 shadow-lg border-2 border-lightblue max-h-72 overflow-y-auto custom-scrollbar z-10">
                      
              {/* Opção padrão */}
              <li
                onClick={() => {
                  setTheme('');
                  setOpen(false);
              }}
                className="flex items-center justify-start gap-3 px-6 py-3 hover:bg-lightblue text-black text-lg font-semibold cursor-pointer transition-all duration-300"
              >
                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className="text-green"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                Escolha uma opção
              </li>
                      
              {themes.map((t) => (
                <li
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    setOpen(false);
                  }}
                  className="flex items-center justify-start gap-3 px-6 py-3 hover:bg-lightblue text-black text-lg font-semibold cursor-pointer transition-all duration-300"
                >
                  {/* Setinha animada */}
                  <motion.div
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4, type: "spring" }}
                    className="text-green"
                  >
                    ➤
                  </motion.div>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showRestart && (
          <button
            onClick={() => {
              setRound(r => r + 1)
              setShowRestart(false)
            }}
            className="mt-6 border border-red text-red bg-transparent hover:bg-red-600 hover:text-white px-4 py-2 rounded shadow transition cursor-pointer"
          >
            ❌ Jogue de novo
          </button>
        )}

      </div>

      {theme && <h2 className="text-2xl font-semibold text-gray-300 mt-4 mb-6 text-center">Opção: {theme}</h2>}

      <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-900 to-purple-900 min-h-screen text-gray-100">
        
        <div className="mb-2 text-center">
          Rodada: <span className="font-semibold text-blue">{round}</span> | Acertos: <span className="font-semibold text-green">{correctAnswersCount} / {images.length}</span>
        </div>

        {loading ? (
          <div className="text-center text-lg text-gray-300 animate-pulse">🔍 Procurando imagens...</div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl mt-6 cursor-pointer">
              {images.map((img, index) => (
                <motion.div
                  key={index}
                  ref={(el) => {
                    if (el) imageRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-transparent text-black p-4 rounded-2xl flex-grow shadow-2xl max-w-[250px] transition transform hover:scale-105 flex flex-col items-center "
                >
                  <img
                    src={img.url}
                    alt="imagem"
                    className="w-full h-48 object-cover rounded-xl cursor-zoom-in"
                    onClick={() => setZoomedImage(img.url)}
                  />
                  <div className="mt-2 text-gray-300">Escolha o título correto:</div>
                  <div className="relative w-full mt-1">
                    <select
                      className={`
                        w-full appearance-none p-3 rounded-xl border-2 border-lightblue
                        text-white bg-gradient-to-br from-gray-800 to-blue
                        shadow-lg shadow-purple-500/40
                        hover:shadow-xl hover:shadow-pink-500/50
                        transition-all duration-300 ease-out
                        focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1
                        cursor-pointer text-lg tracking-wide font-semibold
                      `}
                      onChange={e => checkAnswer(index, e.target.value)}
                      disabled={!!results[index]}
                    >
                      <option value="">✅ Selecione</option>
                      {img.options.map((opt: string, i: number) => (
                        <option className='cursor-pointer' key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => speakFrench(img.title, speechSpeeds[index])}
                    className="mt-3 p-3 border border-green rounded-xl bg-blue-500 text-white shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-green transition-colors duration-300 cursor-pointer"
                    style={{
                      width: '48px', // Aumentei um pouco para melhor visualização
                      height: '48px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {/* Ícone de "play" estilizado */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-6 h-6 animate-pulse" // Aumentei um pouco o tamanho do ícone
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.54.848l3-2a1 1 0 000-1.696l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <div className="flex items-center mt-2"> 
                    
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speechSpeeds[index]}
                      onChange={(e) => handleSpeedChange(index, parseFloat(e.target.value))}
                      className="w-24 h-2 rounded-full bg-green cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-lightblue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="ml-2 mb-1 text-sm text-white font-bold">{(speechSpeeds[index] ?? 1).toFixed(1)}x</span>
                  </div>

                  {results[index] && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center"
                    >
                      {results[index].correct_answer ? (
                        <>
                          <Check className="mr-2 text-green" size={20} />
                          <span className="font-medium text-green">Correto!</span>
                        </>
                      ) : (
                        <>
                          <X className="mr-2 text-red" size={20} />
                          <span className="font-medium text-red">Errado. <span className="text-green">Resposta: {img.title}</span></span>
                        </>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <div className="relative">
                <motion.button
                  onClick={handleOpenReview}
                  disabled={!isReviewUnlocked || reviewHistory.length === 0}
                  className={`border flex items-center justify-center py-2 px-8 rounded-xl transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 ${
                    isReviewUnlocked && reviewHistory.length > 0
                      ? 'border-blue hover:border-green hover:text-white cursor-pointer text-blue'
                      : 'border-gray-300 bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}
                  variants={unlockButtonVariants}
                  animate={isReviewUnlocking ? 'unlocking' : 'locked'}
                >
                  {!isReviewUnlocked && (
                    <motion.div style={lockIconStyle}>
                      <LockClosedIcon className="inline-block mr-3 mb-1 w-5 h-5" />
                    </motion.div>
                  )}
                  {isReviewUnlocked && <LockOpenIcon className="inline-block mr-2 w-5 h-5 text-yellow" />}
                  Revisar os acertos
                  {isReviewAvailable && reviewHistory.length > 0 && (
                    <span
                      className={`absolute top-[-10px] right-[-10px] bg-green text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-sm font-bold ${isFlashing ? 'animate-ping-once' : ''}`}
                    >
                      {availableReviews}
                    </span>
                  )}
                </motion.button>

                {/* Mensagem de bloqueio */}
                <AnimatePresence>
                  {showLockMessage && !isReviewUnlocked && (
                    <motion.div
                      className="absolute bottom-[-30px] text-sm text-yellow font-semibold"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={lockMessageVariants}
                    >
                      Nível bloqueado!
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Animação de desbloqueio */}
                <AnimatePresence>
                  {showUnlockReviewAnimation && (
                    <motion.div
                      className="absolute top-[-40px] text-green font-bold text-lg"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={unlockAnimationVariants}
                    >
                      Desbloqueado!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {zoomedImage && (
                <motion.div
                  className="fixed top-0 left-0 w-full h-full inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setZoomedImage(null)}
                >
                  <motion.img
                    src={zoomedImage}
                    alt="Zoom"
                    className="max-w-[70%] max-h-[50vh] rounded-xl shadow-2xl"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCongrats && (
                <motion.div
                  className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-green-800 to-lime-700 bg-opacity-80 z-50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="bg-white rounded-xl shadow-lg p-8 text-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                  >
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Parabéns! Você acertou tudo! 🎉</h2>
                    <p className="text-gray-700 mb-4">Próxima rodada em breve...</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showReviewModal && reviewHistory.length > 0 && (
                <motion.div
                  className="fixed top-0 left-0 w-full h-full z-50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Efeito de fundo sombreado */}
                  <motion.div
                    className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 backdrop-blur-md z-40"
                    onClick={handleCloseReview} // Permite fechar ao clicar fora
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    className="bg-gray-900 from-blue to-lightblue rounded-xl shadow-lg p-8 text-center max-w-md w-[90%] z-50"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                  >
                    {/*<h2 className="text-2xl font-bold text-white mb-4">Revisão dos Acertos</h2>*/}
                    <div className="relative">
                      <img
                        src={reviewHistory[currentReviewIndex]?.url}
                        alt={reviewHistory[currentReviewIndex]?.title}
                        className="w-full rounded-lg shadow-md"
                      />
                      <div className="absolute bottom-2 left-0 right-0 bg-black bg-opacity-60 text-white py-2 rounded-b-lg">
                        <p className="text-2xl font-semibold text-lightblue text-shadow-glow">{reviewHistory[currentReviewIndex]?.title}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button 
                        onClick={handlePauseResumeReview} 
                        className="bg-lightblue border border-gray-100 text-white rounded-full p-2 hover:bg-transparent transition cursor-pointer"
                      >
                        {isReviewPaused ? 'Continuar' : 'Pausar'}
                      </button>
                      <button onClick={handleCloseReview} className="bg-red text-white border border-gray-100 rounded-full p-2 hover:bg-transparent transition cursor-pointer">
                        Sair
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

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