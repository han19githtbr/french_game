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
import { DotLoader } from 'react-spinners';

//import successSound from '/sounds/success.mp3';

const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

const animalSounds: Record<string, string> = {
  'Le Chien': '/sounds/cachorro.mp3',
  'Le Chat': '/sounds/gato.mp3',
  'L\'Éléphant': '/sounds/elefante.mp3',
  'Le Lion': '/sounds/lion.mp3',
  'Le Poisson': '/sounds/fish.mp3',
  'Le Requin': '/sounds/fish.mp3',
  'Le Serpent': '/sounds/snake.mp3',
  'L\'Ours': '/sounds/bear.mp3',
  'Le Cheval': '/sounds/horse.mp3',
  'Le Perroquet': '/sounds/parrot.mp3',
  'l\'Oiseau': '/sounds/bird.mp3',
  'Le Crocodile': '/sounds/alligator.mp3',
  'Un Gorille': '/sounds/gorila.mp3',
  'Le Mouton': '/sounds/sheep.mp3',
  'Le Canard': '/sounds/duck.mp3',
}

type Result = {
  correct_word: boolean
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

const lockMessageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.1 } },
};

export default function Game() {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
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

  const [chatRequestsReceived, setChatRequestsReceived] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<{ [clientId: string]: ChatMessage[] }>({});
  const [isChatBubbleOpen, setIsChatBubbleOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState<{ [clientId: string]: boolean }>({});
 
  const clientId = ablyClient?.auth.clientId;
  const playerName = session?.user?.name || 'Anônimo';
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCorrectSound(new Audio('/sounds/correct.mp3'))
      setWrongSound(new Audio('/sounds/wrong.mp3'))
      setSuccessSound(new Audio('/sounds/success.mp3'));
    }
  }, [])
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router]);

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
  
    const generatedClientId = session.user?.email || Math.random().toString(36).substring(2, 9)
    const client = createAblyClient(generatedClientId)
    setAblyClient(client);
  
    return () => {
      client.close()
    }
  }, [session]);

  // Move as declarações das funções para fora do useEffect
  const handleChatMessage = (message: Ably.Message) => {
    const { sender, text, timestamp } = message.data;
    const chatId = message.name?.split(':')[1];
    if (chatId && activeChats[chatId]) {
      setActiveChats((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), { sender, text, timestamp }],
      }));
    }
  };

  const handleTypingStatus = (message: Ably.Message) => {
    const isUserTyping = message.data.isTyping;
    const otherClientId = message.clientId;
    if (otherClientId && isChatBubbleOpen === otherClientId) {
      setTypingIndicator((prev) => ({ ...prev, [otherClientId]: isUserTyping }));
    }
  };

  useEffect(() => {
    if (!ablyClient || !session) return;
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const currentClientId = ablyClient.auth.clientId!
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`)
    const chatChannelPrefix = 'chat:';
    const typingChannelPrefix = 'typing:';

    const onConnected = async () => {
      await presenceChannel.presence.enter({ name });
      await syncPresence();
    
      // ▶️ Quando alguém entra
      presenceChannel.presence.subscribe('enter', (member: any) => {
        const newPlayer = { name: member.data.name, clientId: member.clientId }
        if (member.clientId !== currentClientId) {
          setShowNotification({ name: newPlayer.name, type: 'join' })
          setTimeout(() => setShowNotification(null), 6000)
        }
        syncPresence()
      });
        
      // ⚡ Quando alguém sai
      presenceChannel.presence.subscribe('leave', (member: any) => {
        const leavingPlayer = { name: member.data.name, clientId: member.clientId }
    
        if (leavingPlayer.clientId !== currentClientId) {
          setShowNotification({ name: leavingPlayer.name, type: 'leave' })
          setTimeout(() => setShowNotification(null), 6000)
        }
    
        syncPresence();
      });
    
      chatRequestChannel.subscribe('request', (message: Ably.Message) => {
        const request: ChatRequest = message.data;
        setChatRequestsReceived((prev) => [...prev, request]);
      });
  
      chatRequestChannel.subscribe('response', (message: Ably.Message) => {
        const { accepted, fromClientId, fromName } = message.data;
        if (accepted) {
          alert(`🤝 ${fromName} aceitou seu pedido de bate-papo!`);
          setActiveChats((prev) => ({ ...prev, [fromClientId]: [] }));
          setIsChatBubbleOpen(fromClientId);
          setChatPartnerName(fromName);
        } else {
          alert(`❌ ${fromName} negou seu pedido de bate-papo.`);
        }
      });
    
      const handleChatMessage = (message: Ably.Message) => {
        const { sender, text, timestamp } = message.data;
        const chatId = message.name?.split(':')[1];
        if (chatId && activeChats[chatId]) {
          setActiveChats((prev) => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), { sender, text, timestamp }],
          }));
        }
      };
    
      const handleTypingStatus = (message: Ably.Message) => {
        const isUserTyping = message.data.isTyping;
        const otherClientId = message.clientId;
        if (otherClientId && isChatBubbleOpen === otherClientId) {
          setTypingIndicator((prev) => ({ ...prev, [otherClientId]: isUserTyping }));
        }
      };
    
      for (const chatId in activeChats) {
        ablyClient.channels.get(`<span class="math-inline">\{chatChannelPrefix\}</span>{chatId}`).subscribe('message', handleChatMessage);
        const otherClientId = chatId;
        ablyClient.channels.get(`<span class="math-inline">\{typingChannelPrefix\}</span>{otherClientId}`).subscribe('typing', handleTypingStatus);
      }
    };

    ablyClient.connection.once('connected', onConnected);

    return () => {
      if (ablyClient.connection.state === 'connected') {
        presenceChannel.presence.leave();
      }
      presenceChannel.presence.unsubscribe();
      chatRequestChannel.unsubscribe('request');
      chatRequestChannel.unsubscribe('response');
      for (const chatId in activeChats) {
        ablyClient.channels.get(`<span class="math-inline">\{chatChannelPrefix\}</span>{chatId}`).unsubscribe('message', handleChatMessage);
        const otherClientId = chatId;
        ablyClient.channels.get(`<span class="math-inline">\{typingChannelPrefix\}</span>{otherClientId}`).unsubscribe('typing', handleTypingStatus);
      }
      ablyClient.connection.off('connected', onConnected);
    };
  }, [ablyClient, session, activeChats, isChatBubbleOpen]);
    
  // Atualiza lista de quem está online
  const syncPresence = async () => {
      if (!ablyClient) return;
      const presenceChannel = ablyClient.channels.get('game-room');
      const members = await presenceChannel.presence.get();
      const currentClientId = ablyClient.auth.clientId!;
      const players = members
        .map((member: any) => ({
          name: member.data.name,
          clientId: member.clientId,
        }))
        .filter((player) => player.clientId !== currentClientId);
      setPlayersOnline(players);
  };
        
      
  //syncPresence()
  
  const handleRequestChat = (otherPlayer: Player) => {
    if (!ablyClient) return;
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${otherPlayer.clientId}`);
    chatRequestChannel.publish('request', { fromClientId: clientId, fromName: playerName });
    alert(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`);
  };
  
  const handleAcceptChatRequest = (request: ChatRequest) => {
    if (!ablyClient) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: true, fromClientId: clientId, fromName: playerName });
    setActiveChats((prev) => ({ ...prev, [request.fromClientId]: [] }));
    setIsChatBubbleOpen(request.fromClientId);
    setChatPartnerName(request.fromName);
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
  };

  const handleRejectChatRequest = (request: ChatRequest) => {
    if (!ablyClient) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: false, fromClientId: clientId, fromName: playerName });
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
  };

  const openChatBubble = (player: Player) => {
    setActiveChats((prev) => prev[player.clientId] ? prev : { ...prev, [player.clientId]: [] });
    setIsChatBubbleOpen(player.clientId);
    setChatPartnerName(player.name);
  };

  const closeChatBubble = () => {
    setIsChatBubbleOpen(null);
    setChatPartnerName(null);
    setTypingIndicator({}); // Limpar o indicador de digitação ao fechar o chat
  };

  const handleSendMessage = () => {
    if (!ablyClient || !isChatBubbleOpen || !chatInput.trim()) return;
    const chatChannel = ablyClient.channels.get(`chat:${isChatBubbleOpen}`);
    chatChannel.publish('message', { sender: playerName, text: chatInput, timestamp: Date.now() });
    setActiveChats((prev) => ({
      ...prev,
      [isChatBubbleOpen]: [
        ...(prev[isChatBubbleOpen] || []),
        { sender: playerName, text: chatInput, timestamp: Date.now() },
      ],
    }));
    setChatInput('');
    setIsTyping(false);
    publishTypingStatus(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
      publishTypingStatus(true);
      // Defina um timeout para parar de mostrar "digitando" se o usuário parar de digitar por um tempo
      setTimeout(() => {
        if (isTyping && e.target.value === chatInput) {
          setIsTyping(false);
          publishTypingStatus(false);
        }
      }, 1500); // Tempo em milissegundos para considerar que parou de digitar
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false);
      publishTypingStatus(false);
    }
  };

  const publishTypingStatus = (typing: boolean) => {
    if (!ablyClient || !isChatBubbleOpen) return;
    const typingChannel = ablyClient.channels.get(`typing:${isChatBubbleOpen}`);
    typingChannel.publish('typing', { isTyping: typing });
  };

  
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

      <h1 className="text-2xl font-bold mb-4">Jogadores Online</h1>
      <ul className="space-y-2 w-full max-w-md">
        {playersOnline.map((player) => (
          <li
            key={player.clientId}
            className="bg-slate-700 rounded-md p-3 flex items-center justify-between"
          >
            <span className="font-semibold">{player.name}</span>
            <button
              onClick={() => handleRequestChat(player)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Bate-papo
            </button>
          </li>
        ))}
      </ul>

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
      
      {/* Modal de Pedido de Bate-papo */}
      {chatRequestsReceived.length > 0 && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-slate-800 rounded-md p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Pedidos de Bate-papo</h2>
            <ul className="space-y-2">
              {chatRequestsReceived.map((request) => (
                <li
                  key={request.fromClientId}
                  className="bg-slate-700 rounded-md p-3 flex items-center justify-between"
                >
                  <span>{request.fromName} quer conversar com você!</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAcceptChatRequest(request)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRejectChatRequest(request)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Bolha de Bate-papo */}
      {isChatBubbleOpen && (
        <div className="fixed bottom-6 right-6 bg-slate-700 rounded-lg shadow-md max-w-sm w-full flex flex-col z-50">
          <div className="bg-slate-800 p-3 rounded-t-lg flex justify-between items-center">
            <span className="font-semibold">{chatPartnerName}</span>
            <button onClick={closeChatBubble} className="text-gray-400 hover:text-gray-300 focus:outline-none">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3 overflow-y-auto h-64 flex-grow">
            {activeChats[isChatBubbleOpen]?.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded-md ${
                  msg.sender === playerName ? 'bg-blue-600 text-right text-white self-end' : 'bg-slate-600 text-left'
                }`}
              >
                <span className="text-xs italic">{msg.sender}:</span>
                <p>{msg.text}</p>
              </div>
            ))}
            {typingIndicator[isChatBubbleOpen] && (
              <div className="text-left italic text-gray-400">
                <DotLoader color="#a0aec0" size={15} />
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-600 flex items-center">
            <input
              type="text"
              className="bg-slate-800 text-white rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Mensagem..."
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-3 py-2 ml-2 focus:outline-none focus:ring-2 focus:focus:ring-blue-400"
            >
                Enviar
            </button>
          </div>
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
                className="bg-transparent text-black p-4 rounded-2xl flex-grow shadow-2xl max-w-[280px] transition transform hover:scale-105 "
              >
                <img 
                  src={img.url} 
                  alt="imagem" 
                  className="w-full h-48 object-cover rounded-xl" 
                  onClick={() => setZoomedImage(img.url)}
                />
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
        
          
          <AnimatePresence>
            {zoomedImage && (
              <motion.div
                className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setZoomedImage(null)}
              >
                <motion.img
                  src={zoomedImage}
                  alt="Zoom"
                  className="max-w-[50%] max-h-[80vh] rounded-xl shadow-2xl"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      
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
