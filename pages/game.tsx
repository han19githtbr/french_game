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
import { Realtime, Message } from 'ably'


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
  const [hiddenPlayers, setHiddenPlayers] = useState<string[]>([]);
  
  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  const [clientId, setClientId] = useState<string | null>(null);

  const [chatRequestsReceived, setChatRequestsReceived] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<{ [channelName: string]: ChatMessage[] }>({});
  const [isChatBubbleOpen, setIsChatBubbleOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingHandlersRef = useRef<Record<string, (msg: Ably.Message) => void>>({});

  const [typingIndicator, setTypingIndicator] = useState<{ [clientId: string]: boolean }>({});
  const enterSoundRef = useRef<HTMLAudioElement | null>(null);
  const chatRequestReceivedSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de pedido recebido
  const chatRequestResponseSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de resposta ao pedido
  const chatHandlersRef = useRef<Record<string, (message: Ably.Message) => void>>({});


  //const clientId = ablyClient?.auth.clientId;
  const playerName = session?.user?.name || 'Anônimo';
  
  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  const handleHidePlayer = (clientId: string) => {
    setHiddenPlayers((prev) => [...prev, clientId]);
  };

  const handleShowPlayer = (clientId: string) => {
    setHiddenPlayers((prev) => prev.filter((id) => id !== clientId));
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Exibir por 3 segundos
  };

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

    setClientId(generatedClientId);
  
    return () => {
      client.close()
    }
  }, [session]);


  // [ACRESCENTADO] Função para gerar um nome de canal de chat único para um par de usuários
  const getChatChannelName = (clientId1: string, clientId2: string) => {
    const sortedIds = [clientId1, clientId2].sort();
    return `chat:${sortedIds[0]}-${sortedIds[1]}`;
  };

  // [ACRESCENTADO] Função para gerar um nome de canal de digitação único para um par de usuários
  const getTypingChannelName = (clientId1: string, clientId2: string) => {
    const sortedIds = [clientId1, clientId2].sort();
    return `typing:${sortedIds[0]}-${sortedIds[1]}`;
  };

  
  // Move as declarações das funções para fora do useEffect
  const handleChatMessage = (message: Ably.Message, channelName: string) => {
    const { sender, text, timestamp } = message.data;
    //const channelName = message.name; // [CORRIGIDO] O nome do canal contém os IDs dos participantes
    //const channelName = message.channelName; // ✅ CORRETO

    const otherClientId = channelName.split(':')[1]?.split('-')?.find(id => id !== clientId);
    const otherUserName = playersOnline.find(player => player.clientId === otherClientId)?.name || 'Usuário Desconhecido';

    // Evita duplicar mensagens com mesmo sender + timestamp
    const alreadyExists = activeChats[channelName]?.some(msg =>
      msg.sender === sender && msg.timestamp === timestamp
    );
    if (alreadyExists) return;


    if (channelName && otherClientId) {
      setActiveChats((prev) => ({
        ...prev,
        [channelName]: [...(prev[channelName] || []), { sender, text, timestamp }],
      }));

      // Abrir a caixa de diálogo automaticamente se estiver fechada ou se for uma nova conversa
      if (isChatBubbleOpen !== channelName) {
        setIsChatBubbleOpen(channelName);
        setChatPartnerName(sender === playerName ? otherUserName : sender); // Define o nome do parceiro correto
      }
    }
  };

  const handleTypingStatus = (message: Ably.Message) => {
    const isUserTyping = message.data.isTyping;
    const otherClientId = message.clientId;
    // [CORRIGIDO] Verifica se otherClientId é definido antes de usá-lo
    if (otherClientId && isChatBubbleOpen && isChatBubbleOpen.includes(otherClientId) && clientId !== otherClientId) {
      setTypingIndicator((prev) => ({ ...prev, [otherClientId]: isUserTyping }));
    }
  };

  useEffect(() => {
    if (!ablyClient || !session || !clientId) return;
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const currentClientId = clientId!
    
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
    
      const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`);
      chatRequestChannel.subscribe('request', (message: Ably.Message) => {
        const request: ChatRequest = message.data;
        setChatRequestsReceived((prev) => [...prev, request]);
        // Reproduzir som ao receber um pedido de bate-papo
        chatRequestReceivedSoundRef.current?.play();
      });
  
      chatRequestChannel.subscribe('response', (message: Ably.Message) => {
        const { accepted, fromClientId, fromName } = message.data;
        if (accepted) {
          // Reproduzir som ao receber uma resposta (aceitar ou recusar)
          chatRequestResponseSoundRef.current?.play();
          //alert(`🤝 ${fromName} aceitou seu pedido de bate-papo!`);
          showToast(`🤝 ${fromName} aceitou seu pedido de bate-papo!`, 'info');
          const chatChannelName = getChatChannelName(currentClientId, fromClientId);
          setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
          setIsChatBubbleOpen(chatChannelName);
          setChatPartnerName(fromName);
          
          if (!chatHandlersRef.current[chatChannelName]) {
            const chatMessageHandler = (message: Ably.Message) => {
              handleChatMessage(message, chatChannelName);
            };
            subscribeToChatChannel(ablyClient, chatChannelName, chatMessageHandler, chatHandlersRef);
          }
          
         
          // [ACRESCENTADO] Inscrever-se no canal de digitação quando o chat é aceito
          ablyClient.channels
            .get(getTypingChannelName(currentClientId, fromClientId))
            .subscribe('typing', handleTypingStatus);
        } else {
          //alert(`❌ ${fromName} negou seu pedido de bate-papo.`);
          showToast(`❌ ${fromName} negou seu pedido de bate-papo.`, 'info');
        }
      });
             
      
    };

    ablyClient.connection.once('connected', onConnected);

    return () => {
      if (ablyClient?.connection?.state === 'connected') {
        presenceChannel.presence.leave();
      }
      presenceChannel.presence.unsubscribe();
      const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`);
      chatRequestChannel?.unsubscribe('request');
      chatRequestChannel?.unsubscribe('response');
      // [CORRIGIDO] Cancelar a inscrição de todos os canais de chat ativos ao desmontar
      for (const channelName in activeChats) {
        ablyClient?.channels.get(channelName).unsubscribe('message', chatHandlersRef.current[channelName]);
        // [ACRESCENTADO] Extrai os clientIds do nome do canal para cancelar a inscrição do canal de digitação
        const ids = channelName.split(':')[1]?.split('-');
        if (ids && ids.length === 2) {
          const typingChannelName = getTypingChannelName(ids[0], ids[1]);
          ablyClient?.channels.get(typingChannelName)?.unsubscribe('typing', handleTypingStatus);
        }
      }
      ablyClient.connection.off('connected', onConnected);
    };
  }, [ablyClient, session, clientId]);
    
  // Atualiza lista de quem está online
  const syncPresence = async () => {
    if (!ablyClient) return;
    const presenceChannel = ablyClient.channels.get('game-room');
    const members = await presenceChannel.presence.get();
    const currentClientId = clientId!;
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
    if (!ablyClient || !clientId) return;
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${otherPlayer.clientId}`);
    chatRequestChannel.publish('request', { fromClientId: clientId, fromName: playerName });
    //alert(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`);
    showToast(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`, 'info');
  };
  
  const subscribeToChatChannel = (
    ablyClient: Realtime,
    channelName: string,
    handler: (msg: Ably.Message) => void,
    handlersRef: React.MutableRefObject<Record<string, (msg: Ably.Message) => void>>
  ) => {
    const channel = ablyClient.channels.get(channelName);
  
    // Remove qualquer handler antigo
    if (handlersRef.current[channelName]) {
      channel.unsubscribe('message', handlersRef.current[channelName]);
    }
  
    // Adiciona o novo handler
    channel.subscribe('message', handler);
  
    // Salva referência
    handlersRef.current[channelName] = handler;
  };
  

  const handleAcceptChatRequest = (request: ChatRequest) => {
    if (!ablyClient || !clientId) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: true, fromClientId: clientId, fromName: playerName });
    const chatChannelName = getChatChannelName(clientId, request.fromClientId);
    setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
    setIsChatBubbleOpen(chatChannelName);
    setChatPartnerName(request.fromName);
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
    
    // [CORREÇÃO] Inscrever-se nos canais de mensagens e digitação AQUI para o receptor
    //ablyClient.channels.get(chatChannelName).subscribe('message', handleChatMessage);
    
    // ⚠️ Verifica se já tem handler antes de criar novo
    if (!chatHandlersRef.current[chatChannelName]) {
      const chatMessageHandler = (message: Ably.Message) => {
        handleChatMessage(message, chatChannelName);
      };

      subscribeToChatChannel(ablyClient, chatChannelName, chatMessageHandler, chatHandlersRef);
    }
    

    const typingChannelName = getTypingChannelName(clientId, request.fromClientId);
    if (!typingHandlersRef.current[typingChannelName]) {
      ablyClient.channels
        .get(typingChannelName)
        .subscribe('typing', handleTypingStatus);
      typingHandlersRef.current[typingChannelName] = handleTypingStatus;
    }

    
    // [ACRESCENTADO] Abrir a bolha de chat após a aceitação
    openChatBubble({ clientId: request.fromClientId, name: request.fromName });
    // Reproduzir som ao aceitar um pedido
    chatRequestResponseSoundRef.current?.play();
  };

  const handleRejectChatRequest = (request: ChatRequest) => {
    if (!ablyClient || !clientId) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: false, fromClientId: clientId, fromName: playerName });
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
    // Reproduzir som ao recusar um pedido
    chatRequestResponseSoundRef.current?.play();
  };

  const openChatBubble = (player: Player) => {
    if (!clientId || !ablyClient) { // [CORRIGIDO] Verifica se clientId e ablyClient são null
      return;
    }
    const chatChannelName = getChatChannelName(clientId, player.clientId);
    setActiveChats((prev) => prev[chatChannelName] ? prev : { ...prev, [chatChannelName]: [] });
    setIsChatBubbleOpen(chatChannelName);
    setChatPartnerName(player.name);
    // [ACRESCENTADO] Inscrever-se no canal de mensagens ao abrir a bolha
    // [CORRIGIDO] A verificação de existência do canal não é necessária antes de se inscrever
    /*ablyClient.channels.get(chatChannelName).subscribe('message', handleChatMessage);

    // [ACRESCENTADO] Inscrever-se no canal de digitação ao abrir a bolha
    // [CORRIGIDO] A verificação de existência do canal não é necessária antes de se inscrever
    const typingChannelName = getTypingChannelName(clientId, player.clientId);
    ablyClient.channels.get(typingChannelName).subscribe('typing', handleTypingStatus);*/
  };

  const closeChatBubble = () => {
    setIsChatBubbleOpen(null);
    setChatPartnerName(null);
    setTypingIndicator({}); // Limpar o indicador de digitação ao fechar o chat
  };

  const handleSendMessage = () => {
    if (!ablyClient || !isChatBubbleOpen || !chatInput.trim() || !clientId) return;
    const chatChannel = ablyClient.channels.get(isChatBubbleOpen);
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
    //publishTypingStatus(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
      publishTypingStatus(true);
      setTimeout(() => {
        if (isTyping && e.target.value === chatInput) {
          setIsTyping(false);
          publishTypingStatus(false);
        }
      }, 1500);
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false);
      publishTypingStatus(false);
    }
  };

  const publishTypingStatus = (typing: boolean) => {
    if (!ablyClient || !isChatBubbleOpen || !clientId) return;
    // [CORRIGIDO] Envia o status de digitação para o canal correto baseado no chat aberto
    const otherClientId = isChatBubbleOpen.split(':')[1]?.split('-')?.find(id => id !== clientId);
    if (otherClientId) {
      const typingChannel = ablyClient.channels.get(getTypingChannelName(clientId, otherClientId));
      typingChannel.publish('typing', { isTyping: typing });
    }
  };

  // [ACRESCENTADO] Estado para armazenar o clientId assim que estiver disponível
  useEffect(() => {
    if (ablyClient) {
      setClientId(ablyClient.auth.clientId);
    }
  }, [ablyClient]);

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
          <div className="flex items-center gap-2 cursor-pointer mt-10">
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

      {/*<h1 className="text-2xl font-bold mb-4 mt-6">Jogadores Online</h1>*/}
      <ul className="space-y-3 w-full max-w-md">
        {playersOnline
        .filter((player) => !hiddenPlayers.includes(player.clientId))
        .map((player) => (
          <li
            key={player.clientId}
            className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 flex items-center justify-between shadow-md border border-gray-600 transition duration-300 ease-in-out transform hover:scale-105"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full bg-green mr-1 animate-pulse shrink-0" />
              <span className="font-bold text-lg text-white truncate max-w-[140px] sm:max-w-[180px]">
                {player.name}
              </span>
            </div>

            <div className="flex items-center shrink-0">
              <button
                onClick={() => handleHidePlayer(player.clientId)}
                className="bg-blue hover:bg-gray-700 text-white font-bold py-2 px-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-500 mr-2 cursor-pointer"
                title="Ocultar Jogador"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.06 10.06 0 012.19-3.368M6.423 6.423A9.967 9.967 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-4.128 5.14M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9 9l18-18" />
                </svg>

              </button>

              <button
                onClick={() => {
                  handleRequestChat(player);
                  openChatBubble(player);
                }}
                className="bg-gradient-to-br from-blue to-purple hover:from-blue hover:to-purple text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Bate-papo
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Miniaturas dos jogadores ocultos */}
      <div className="fixed bottom-4 right-4 max-w-sm w-full bg-gray-800 rounded-md shadow-md border border-blue overflow-x-auto h-16 flex items-center p-2 space-x-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 cursor-pointer">
        {playersOnline
          .filter((player) => hiddenPlayers.includes(player.clientId))
          .map((player) => (
            <div
              key={player.clientId}
              className="w-8 h-8 rounded-full bg-gray-700 border border-blue flex items-center justify-center text-white text-xs cursor-pointer mr-2"
              onClick={() => handleShowPlayer(player.clientId)}
              title={`Mostrar ${player.name}`}
            >
              {player.name.substring(0, 2).toUpperCase()}
            </div>
          ))}
      </div>

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-5 left-5 bg-gradient-to-r from-blue to-purple text-white px-6 py-3 rounded-2xl shadow-xl z-50"
          >
          {showNotification.type === 'join' ? (
            <>🎮 {showNotification.name} entrou no jogo!</>
          ) : (
            <>⚡ {showNotification.name} saiu do jogo.</>
          )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <>
        <audio ref={enterSoundRef} src="/sounds/accepted_sound.mp3" preload="auto" />
        <audio ref={chatRequestReceivedSoundRef} src="/sounds/received_sound.mp3" preload="auto" />
        <audio ref={chatRequestResponseSoundRef} src="/sounds/refuse_sound.mp3" preload="auto" />
        {chatRequestsReceived.length > 0 && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-8 max-w-md w-full shadow-lg border-2 border-gray-600 animate__animated animate__fadeIn">
              <h2 className="text-xl font-bold text-yellow mb-6 glow-text">🕹️ Pedidos de Bate-papo Recebidos!</h2>
              <ul className="space-y-4">
                {chatRequestsReceived.map((request) => (
                  <li
                    key={request.fromClientId}
                    className="bg-gray-900 rounded-md p-4 flex items-center justify-between border-b border-gray-700"
                  >
                    <span className="text-white font-semibold">{request.fromName}</span>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAcceptChatRequest(request)}
                        className="flex items-center justify-center whitespace-nowrap bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue"
                      >
                        <Check className="h-5 w-5 mr-2 shrink-0" /> Aceitar
                      </button>
                      <button
                        onClick={() => handleRejectChatRequest(request)}
                        className="flex items-center justify-center whitespace-nowrap bg-red hover:bg-red text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red"
                      >
                        <X className="h-5 w-5 mr-2 shrink-0" /> Recusar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
      {isChatBubbleOpen && (
        <div
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-50
              w-full max-w-[calc(100vw-16px)] sm:max-w-md
              flex flex-col shadow-lg rounded-t-lg bg-gradient-to-br from-gray-800 to-gray-700
              border-t-2 border-gray-600
              animate__animated animate__slideInUp
              rounded-bl-none rounded-br-none
              px-2 sm:px-0
            `}
        >
          
          <div className="bg-gray-900 p-3 rounded-t-lg flex justify-between items-center border-b border-gray-700">
            <span className="font-bold text-gray-300 glow-text">{chatPartnerName}</span>
            <button onClick={closeChatBubble} className="text-gray-400 hover:text-gray-300 focus:outline-none">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3 overflow-y-auto h-64 flex-grow">
            {activeChats[isChatBubbleOpen]?.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-3 rounded-md ${
                  msg.sender === playerName
                    ? 'bg-gray-800 text-right text-white self-end shadow-md'
                    : 'bg-gray-800 text-left text-white shadow-md'
                }`}
              >
                <span className="text-xs italic text-gray-300">{msg.sender}:</span>
                <p className="font-medium">{msg.text}</p>
              </div>
            ))}
            {typingIndicator[isChatBubbleOpen] && (
              <div className="text-left italic text-gray-400">
                <DotLoader color="#a0aec0" size={15} /> <span className="ml-1">Digitando...</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-700 flex items-center">
            <input
              type="text"
              className="bg-gray-900 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-inner"
              placeholder="Enviar mensagem..."
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md ml-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
        className="text-4xl font-bold mb-8 mt-36 text-center drop-shadow-md"
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
                  className="w-full h-48 object-cover rounded-xl cursor-zoom-in" 
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
                        <span className="font-medium text-green">Correto!</span>
                      </>
                    ) : (
                      <>
                        <X className="mr-2" color="red"/>
                        <span className="font-medium text-red">Errado. Resposta: {img.title}</span>
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
