/*'use client'*/

import { useEffect, useRef, useState, RefObject, useCallback } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X, Minus, Lock } from 'lucide-react'
import { motion , AnimatePresence, useMotionValue, useTransform, animate, MotionValue} from 'framer-motion'
import { saveProgress } from './results'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid';
import { io } from 'socket.io-client'
import { DotLoader } from 'react-spinners';
import { Realtime, Message } from 'ably'
import { useSound } from 'use-sound';


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
  'L\'Oiseau': '/sounds/bird.mp3',
  'Le Crocodile': '/sounds/alligator.mp3',
  'Un Gorille': '/sounds/gorila.mp3',
  'Le Mouton': '/sounds/sheep.mp3',
  'Le Canard': '/sounds/duck.mp3',
  'Un Coq': '/sounds/clucking.mp3',
}

type Result = {
  correct_word: boolean
  selected: string
}

type Player = {
  clientId: string
  name: string
  avatarUrl?: string;
}

interface OnlineNotificationsProps {
  playersOnline: Player[];
  handleRequestChat: (player: Player) => void;
  openChatBubble: (player: Player) => void;
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
  avatarUrl?: string;
};

type ChatMessage = {
  sender: string;
  text: string;
  timestamp: number;
};

type SetterFunction = (value: boolean) => void;

interface ReviewItem {
  url: string;
  title: string;
}

//const frenchVoices = ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU'];

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

export default function Game() {
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
  //const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)

  const [isFrasesUnlocked, setIsFrasesUnlocked] = useState(false);
  const [showLockMessage, setShowLockMessage] = useState(false);

  const [isProverbsUnlocked, setIsProverbsUnlocked] = useState(false);
  
  const [isFrasesUnlocking, setIsFrasesUnlocking] = useState(false);
  const [isProverbsUnlocking, setIsProverbsUnlocking] = useState(false);
  const [showUnlockFrasesAnimation, setShowUnlockFrasesAnimation] = useState(false);
  const [showUnlockProverbsAnimation, setShowUnlockProverbsAnimation] = useState(false);

  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);
  const [playUnlockSound] = useSound('/sounds/unlock.mp3');

  const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  const [chatPartnerAvatar, setChatPartnerAvatar] = useState(''); // [NOVO] Estado para armazenar a URL do avatar do parceiro de chat atual.
  
  const [hiddenPlayers, setHiddenPlayers] = useState<string[]>([]);
  
  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  const [clientId, setClientId] = useState<string | null>(null);

  const [chatRequestsReceived, setChatRequestsReceived] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<{ [channelName: string]: ChatMessage[] }>({});
  const [isChatBubbleOpen, setIsChatBubbleOpen] = useState<string | false>(false);
  const [chatInput, setChatInput] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingHandlersRef = useRef<Record<string, (msg: Ably.Message) => void>>({});

  const [typingIndicator, setTypingIndicator] = useState<{ [clientId: string]: boolean }>({});
  const enterSoundRef = useRef<HTMLAudioElement | null>(null);
  const chatRequestReceivedSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de pedido recebido
  const chatRequestResponseSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de resposta ao pedido
  const chatHandlersRef = useRef<Record<string, (message: Ably.Message) => void>>({});

  const [chatRequestsSent, setChatRequestsSent] = useState<{ toClientId: string, toName: string }[]>([]);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 }) // canto superior esquerdo
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 130, y: 130 });
  const [visibleModals, setVisibleModals] = useState<Record<string, boolean>>({});
  const [minimizedRequests, setMinimizedRequests] = useState<string[]>([]);
  const [minimizedChat, setMinimizedChat] = useState<string | false>(false); // [NOVO] Estado para controlar o ID do chat que está minimizado (se estiver `false`, nenhum está minimizado).

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

  const unlockSound = typeof Audio !== 'undefined' ? new Audio('/sounds/unlock.mp3') : null;

  const [isFlashing, setIsFlashing] = useState(false); // Estado para controlar a animação de piscar
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  const [open, setOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newPlayerAlert, setNewPlayerAlert] = useState('');
  const alertTimeout = useRef<NodeJS.Timeout | null>(null);

  //const clientId = ablyClient?.auth.clientId;
  const playerName = session?.user?.name || 'Anônimo';
  
  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  const handleUnlockAnimationEnd = (setter: SetterFunction) => {
    setTimeout(() => {
      setter(false);
    }, 4000); // Mantém a animação por 4 segundos
  };

  const handleHidePlayer = (clientId: string) => {
    setHiddenPlayers((prev) => [...prev, clientId]);
  };

  const handleShowPlayer = (clientIdToShow: string) => {
    setHiddenPlayers((prev) => prev.filter((id) => id !== clientIdToShow));
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
  }, []);
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router]);

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

    
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchCancel);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [dragging, offset]);

  
  useEffect(() => {
    // Simula a chegada de um novo jogador (você precisará adaptar isso à sua lógica real)
    const newPlayers = playersOnline.filter(player => /* sua lógica para identificar novos jogadores */ true);

    if (newPlayers.length > 0) {
      setNotificationCount(prevCount => prevCount + newPlayers.length);
      setNewPlayerAlert('Novo usuário online!');
      if (alertTimeout.current) { // Verifica se alertTimeout.current tem um valor
        clearTimeout(alertTimeout.current);
      }
      alertTimeout.current = setTimeout(() => {
        setNewPlayerAlert('');
      }, 2000);
    }
  }, [playersOnline /*, dependências que indicam novos jogadores */ ]);
  

  const toggleNotifications = useCallback(() => {
    setShowNotifications(prev => {
      const newValue = !prev;
      if (newValue) {
        document.body.classList.add('overlay-active'); // Adiciona classe ao body
        setNotificationCount(0);
      } else {
        document.body.classList.remove('overlay-active'); // Remove classe do body
      }
      return newValue;
    });
  }, []);


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

    let startX: number | undefined;
    let startY: number | undefined;
    const rect = boxRef.current.getBoundingClientRect();

    if (e instanceof MouseEvent) {
      startX = e.clientX;
      startY = e.clientY;
    } else if (e instanceof TouchEvent && e.touches.length > 0) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }

    if (startX !== undefined && startY !== undefined) {
      setOffset({
        x: startX - rect.left,
        y: startY - rect.top,
      });
      // Tenta definir a posição inicial para o ponto do clique/toque
      setPosition({ x: startX - (startX - rect.left), y: startY - (startY - rect.top) });
    }
  };


  useEffect(() => {
    if (theme) loadImages()
  }, [theme, round])


  useEffect(() => {
    const correctAnswersInRound = results.filter(res => res?.correct_word);
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
    if (!showCongrats && images.length > 0) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500); // Pequeno delay para garantir que novas imagens renderizem
    }
  }, [showCongrats, images]);
  
  
  /*useEffect(() => {
    if (correctAnswersCount >= 2) {
      setIsFrasesUnlocked(true);
    } else if(correctAnswersCount >= 1) {
      setIsProverbsUnlocked(true);
    }
  }, [correctAnswersCount]);*/

  useEffect(() => {
    if (correctAnswersCount >= 2) {
      if (!isFrasesUnlocked) {
        setIsFrasesUnlocking(true);
        playUnlockSound();
        setShowUnlockFrasesAnimation(true);
        setTimeout(() => {
          setIsFrasesUnlocked(true);
          setIsFrasesUnlocking(false);
          handleUnlockAnimationEnd(setShowUnlockFrasesAnimation);
        }, 1000); // Tempo para a animação de destravar
      }
    } else if (correctAnswersCount >= 1) {
      if (!isProverbsUnlocked) {
        setIsProverbsUnlocking(true);
        playUnlockSound();
        setShowUnlockProverbsAnimation(true);
        setTimeout(() => {
          setIsProverbsUnlocked(true);
          setIsProverbsUnlocking(false);
          handleUnlockAnimationEnd(setShowUnlockProverbsAnimation);
        }, 1000); // Tempo para a animação de destravar
      }
       
    
    }
  }, [correctAnswersCount, isFrasesUnlocked, isProverbsUnlocked, unlockSound]);

 
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
  
    if (otherClientId && isChatBubbleOpen) {
      if (typeof otherClientId === 'string') {
        // ✅ Aserção de tipo para clientId
        const chatChannelName = getChatChannelName(clientId as string, otherClientId);
        if (chatChannelName === isChatBubbleOpen && clientId !== otherClientId) {
          setTypingIndicator((prev) => ({ ...prev, [isChatBubbleOpen]: isUserTyping }));
        }
      } else {
        console.warn('handleTypingStatus: otherClientId não é uma string:', otherClientId);
      }
    }
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
  

  const subscribeToChatAndTypingChannels = useCallback((clientId1: string, clientId2: string) => {
    if (!ablyClient) return;

    const chatChannelName = getChatChannelName(clientId1, clientId2);
    const chatMessageHandler = useCallback((message: Ably.Message) => {
      handleChatMessage(message, chatChannelName);
    }, [handleChatMessage, chatChannelName]);

    subscribeToChatChannel(ablyClient, chatChannelName, chatMessageHandler, chatHandlersRef);

    const typingChannelName = getTypingChannelName(clientId1, clientId2);
    if (!typingHandlersRef.current[typingChannelName]) {
      ablyClient.channels
        .get(typingChannelName)
        .subscribe('typing', handleTypingStatus);
      typingHandlersRef.current[typingChannelName] = handleTypingStatus;
    }
  }, [ablyClient, getChatChannelName, getTypingChannelName, handleChatMessage, handleTypingStatus, chatHandlersRef, subscribeToChatChannel, typingHandlersRef]);

  
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
          
          /*if (!chatHandlersRef.current[chatChannelName]) {
            const chatMessageHandler = (message: Ably.Message) => {
              handleChatMessage(message, chatChannelName);
            };
            subscribeToChatChannel(ablyClient, chatChannelName, chatMessageHandler, chatHandlersRef);
          }
                  
          // [ACRESCENTADO] Inscrever-se no canal de digitação quando o chat é aceito
          ablyClient.channels
            .get(getTypingChannelName(currentClientId, fromClientId))
            .subscribe('typing', handleTypingStatus);*/
            subscribeToChatAndTypingChannels(currentClientId, fromClientId);  
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
          //ablyClient?.channels.get(typingChannelName)?.unsubscribe('typing', handleTypingStatus);
          ablyClient?.channels.get(typingChannelName)?.unsubscribe('typing', typingHandlersRef.current[typingChannelName]);
        }
      }
      ablyClient.connection.off('connected', onConnected);
    };
  //}, [ablyClient, session, clientId]);
  }, [ablyClient, session, clientId, getChatChannelName, getTypingChannelName, handleChatMessage, handleTypingStatus, subscribeToChatChannel, showToast, chatRequestReceivedSoundRef, chatRequestResponseSoundRef, playersOnline, subscribeToChatAndTypingChannels]);  
  
  
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
        
      
  const handleRequestChat = (otherPlayer: Player) => {
    if (!ablyClient || !clientId) return;
    
    // ✅ Verifica se já foi enviado um pedido para este jogador
    const alreadySent = chatRequestsSent.some(
      (req) => req.toClientId === otherPlayer.clientId
    );

    if (alreadySent) {
      showToast(`⚠️ Você já enviou um pedido para ${otherPlayer.name}. Aguarde a resposta.`, 'info');
      return;
    }
    
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${otherPlayer.clientId}`);
    chatRequestChannel.publish('request', { fromClientId: clientId, fromName: playerName });
    
    // ✅ Armazena o pedido enviado
    setChatRequestsSent((prev) => [
      ...prev,
      { toClientId: otherPlayer.clientId, toName: otherPlayer.name },
    ]);

    showToast(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`, 'info');
  };
  

  const handleAcceptChatRequest = (request: ChatRequest) => {
    if (!ablyClient || !clientId) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: true, fromClientId: clientId, fromName: playerName });
    const chatChannelName = getChatChannelName(clientId, request.fromClientId);
    setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
    setIsChatBubbleOpen(chatChannelName);
    setChatPartnerName(request.fromName);
    const partner = playersOnline.find(p => p.clientId === request.fromClientId);
    setChatPartnerAvatar(partner?.avatarUrl || '');
    setMinimizedChat(false);
    
    // ✅ Remove o pedido da lista de recebidos
    setChatRequestsReceived((prev) =>
      prev.filter((req) => req.fromClientId !== request.fromClientId)
    );

    // ✅ Remove o pedido da lista de enviados
    setChatRequestsSent((prev) =>
      prev.filter((req) => req.toClientId !== request.fromClientId)
    );
    
    setVisibleModals(prev => ({ ...prev, [request.fromClientId]: false }));
    setMinimizedRequests(prev => prev.filter(id => id !== request.fromClientId)); // Remove da lista de minimizados

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
    // openChatBubble({ clientId: request.fromClientId, name: request.fromName });
    // Reproduzir som ao aceitar um pedido
    chatRequestResponseSoundRef.current?.play();
  };


  const handleRejectChatRequest = (request: ChatRequest) => {
    if (!ablyClient || !clientId) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: false, fromClientId: clientId, fromName: playerName });
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
    setVisibleModals(prev => ({ ...prev, [request.fromClientId]: false }));
    setMinimizedRequests(prev => prev.filter(id => id !== request.fromClientId));
    // Reproduzir som ao recusar um pedido
    chatRequestResponseSoundRef.current?.play();
  };

  const handleOpenChatRequest = (request: ChatRequest) => {
    // Exibe o modal correspondente ao pedido clicado
    setVisibleModals(prev => ({ ...prev, [request.fromClientId]: true }));
    setMinimizedRequests(prev => prev.filter(id => id !== request.fromClientId));
  };

  const handleMinimizeChatRequest = (clientId: string) => {
    // Esconde o modal correspondente ao pedido minimizado
    setVisibleModals(prev => ({ ...prev, [clientId]: false }));
    if (!minimizedRequests.includes(clientId)) {
      setMinimizedRequests(prev => [...prev, clientId]);
    }
  };

  const handleMinimizeChat = useCallback(() => {
    if (isChatBubbleOpen) {
      setMinimizedChat(isChatBubbleOpen); // Define o estado `minimizedChat` com o ID do chat atual ao minimizar.
      setIsChatBubbleOpen(false); // Fecha a caixa de bate-papo principal.
    }
  }, [isChatBubbleOpen]);


  const handleOpenMinimizedChat = useCallback(() => {
    if (minimizedChat) {
      setIsChatBubbleOpen(minimizedChat); // Abre a caixa de bate-papo novamente definindo `isChatBubbleOpen` com o ID minimizado.
      setMinimizedChat(false); // Limpa o estado de minimizado.
    }
  }, [minimizedChat]);


  const handleOpenMinimizedRequest = (clientId: string) => {
    const request = chatRequestsReceived.find(req => req.fromClientId === clientId);
    if (request) {
      handleOpenChatRequest(request);
    }
  };

  const openChatBubble = (player: Player) => {
    if (!clientId || !ablyClient) { // [CORRIGIDO] Verifica se clientId e ablyClient são null
      return;
    }
    const chatChannelName = getChatChannelName(clientId, player.clientId);
    setActiveChats((prev) => prev[chatChannelName] ? prev : { ...prev, [chatChannelName]: [] });
    setIsChatBubbleOpen(chatChannelName);
    setChatPartnerName(player.name);
    
  };

  
  /*const handleSendMessage = () => {
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
  };*/

  const handleSendMessage = () => {
    if (!ablyClient || !isChatBubbleOpen || !chatInput.trim() || !clientId) return;
    const chatChannel = ablyClient.channels.get(isChatBubbleOpen);
    const messageData = { sender: playerName, text: chatInput, timestamp: Date.now() };
    chatChannel.publish('message', messageData);
    setActiveChats((prev) => ({
      ...prev,
      [isChatBubbleOpen]: [
        ...(prev[isChatBubbleOpen] || []),
        messageData,
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
          
      // Adiciona os acertos da rodada ao histórico de revisão
      const currentRoundCorrect = images.filter((_, i) => newResults[i]?.correct_word).map(img => ({
        url: img.url,
        title: img.title,
      }));
      if (currentRoundCorrect.length > 0) {
        setReviewHistory(prev => [...prev, ...currentRoundCorrect]);
        setAvailableReviews(prev => prev + currentRoundCorrect.length);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 2000);
      }

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
  

  const handleOpenReview = () => {
    if (isReviewUnlocked) {
      setShowReviewModal(true);
      setCurrentReviewIndex(0);
      startReviewVideo();
      setAvailableReviews(0); // Marca as revisões como assistidas
      setIsReviewPaused(false); // Inicializa como não pausado ao abrir
    } else {
      setShowLockMessage(true);
      setTimeout(() => {
        setShowLockMessage(false);
      }, 2000);
    }
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

  const handleProverbsClick = () => {
    if (isProverbsUnlocked) {
      router.push('/proverbs');
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
          {/* Adicionando um pequeno "espaço invisível" para manter o hover ativo */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none group-hover:block"></div>
        </div>
      )}

      <div className="fixed top-4 left-4 z-50">
        {/* Alerta de novo jogador */}
        {newPlayerAlert && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-green-500 text-white py-2 px-4 rounded-md shadow-md transition-opacity duration-500 ease-in-out">
            {newPlayerAlert}
          </div>
        )}

        {/* Sininho de Notificações */}
        <button
          onClick={toggleNotifications}
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

        {/* Lista de Jogadores (aparece ao clicar no sininho) */}
        {showNotifications && (
          <div 
            className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-md shadow-lg mt-2 w-64"
            style={{ zIndex: 9999 }}
          >
            <h2 className="text-lg font-semibold text-white p-3 border-b border-gray-800">Jogadores Online</h2>
            <ul className="divide-y divide-gray-800">
              {playersOnline.map((player) => (
                <li key={player.clientId} className="p-3 hover:bg-gray-800 transition duration-200 ease-in-out cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-white text-sm truncate">{player.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleRequestChat(player);
                        openChatBubble(player);
                        setShowNotifications(false); // Fecha a lista após solicitar o chat
                      }}
                      className="bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs font-semibold py-1 px-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Chat
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {playersOnline.length === 0 && (
              <div className="text-gray-500 p-3 text-center">Nenhum jogador online no momento.</div>
            )}
          </div>
        )}
      </div>

      {/* Caixinha de miniaturas arrastável */}
      <div
        ref={boxRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: 'auto',
          maxWidth: '90vw',
          maxHeight: '90vh',
          minWidth: '220px',
          //zIndex: 9999,
          cursor: 'grab',
        }}
        className="bg-transparent text-white mt-20 p-3 rounded-md shadow-lg border border-blue"
      >
        <div className="font-bold mb-2 select-none text-blue">Pode arrastar</div>
        <div className="font-bold mb-2 select-none text-green">Jogadores Online</div>

        <div
          className="bg-gray-900 border border-green rounded p-2 overflow-x-auto"
          style={{
            minHeight: 'calc(17vh - 60px)', // Mantém a altura mínima
            whiteSpace: 'nowrap',
            display: 'flex', // Adicionamos flex para alinhar as bolinhas horizontalmente
            alignItems: 'center', // Opcional: alinha verticalmente as bolinhas no centro
          }}
        >
          {playersOnline.map((player) => (
            <div
              key={player.clientId}
              className={`rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md border border-gray-700 cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 mr-2 last:mr-0 ${hiddenPlayers.includes(player.clientId) ? 'opacity-50' : ''}`}
              onClick={() => handleShowPlayer(player.clientId)}
              title={hiddenPlayers.includes(player.clientId) ? 'Mostrar Jogador' : player.name}
              style={{ flexShrink: 0 }} // Impede que as bolinhas encolham
            >
              <span className="text-white text-xs sm:text-sm font-semibold">{player.name.charAt(0).toUpperCase()}</span>
            </div>
          ))}
        </div>
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
      
      <>
        <audio ref={enterSoundRef} src="/sounds/received_sound.mp3" preload="auto" />
        <audio ref={chatRequestReceivedSoundRef} src="/sounds/accepted_sound.mp3" preload="auto" />
        <audio ref={chatRequestResponseSoundRef} src="/sounds/message.mp3" preload="auto" />
                
        {minimizedRequests.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full bg-gray-800 bg-opacity-80 border-t border-gray-700 py-2 px-4 flex items-center overflow-x-auto scrollbar-hide z-40">
            {minimizedRequests.map((clientId) => {
              const request = chatRequestsReceived.find(req => req.fromClientId === clientId);
              return request ? (
                <div
                  key={clientId}
                  className="bg-gradient-to-br from-yellow-600 to-yellow-500 rounded-full p-2 mr-2 cursor-pointer shadow-md hover:scale-105 transition duration-200 ease-in-out"
                  onClick={() => handleOpenMinimizedRequest(clientId)}
                >
                  <span className="text-xs text-gray-900 font-bold">{request.fromName.substring(0, 2).toUpperCase()}</span> {/* Avatar inicial */}
                </div>
              ) : null;
            })}
          </div>
        )}
        
        {chatRequestsReceived.map((request) => (
          <div
            key={`modal-${request.fromClientId}`}
            id={`modal-${request.fromClientId}`}
            className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 max-w-md w-full shadow-lg border-2 border-gray-600 z-50 animate__animated animate__fadeIn ${visibleModals[request.fromClientId] ? '' : 'hidden'}
            sm:p-8`} /* Ajuste padding em telas maiores */
          >
            <h2 className="text-xl font-bold text-yellow-400 mb-4 glow-text">
              <span role="img" aria-label="joystick" className="mr-2">🕹️</span>
              Pedido de Chat de <span className="text-yellow-300">{request.fromName}</span>!
            </h2>
            <p className="text-gray-300 mb-4 text-sm sm:text-base">
              {/* Você pode adicionar mais informações sobre o pedido aqui, se necessário */}
              Um jogador quer conversar com você!
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleAcceptChatRequest(request)}
                className="flex items-center justify-center whitespace-nowrap bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base"
              >
                <Check className="h-4 w-4 mr-2 shrink-0" /> Aceitar
              </button>
              <button
                onClick={() => handleRejectChatRequest(request)}
                className="flex items-center justify-center whitespace-nowrap bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm sm:text-base"
              >
                <X className="h-4 w-4 mr-2 shrink-0" /> Recusar
              </button>
              <button
                onClick={() => handleMinimizeChatRequest(request.fromClientId)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm sm:text-base"
              >
                <Minus className="h-4 w-4 shrink-0" /> {/* Ícone de minimizar */}
              </button>
            </div>
          </div>
        ))}
      </>
      
      
      {/* [NOVO] Botão para abrir a caixa de bate-papo (quando minimizada) */}
      {minimizedChat && (
        <motion.button
          onClick={handleOpenMinimizedChat}
          className="fixed bottom-12 left-6 bg-gradient-to-br from-purple to-blue hover:from-purple hover:to-green text-white font-bold py-2 px-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple z-50 flex items-center justify-center w-12 h-12 overflow-hidden cursor-pointer"
          initial={{ opacity: 0, scale: 0.8, x: -50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: -50 }}
        >
          {chatPartnerAvatar ? (
            <img src={chatPartnerAvatar} alt={chatPartnerName ? chatPartnerName : "Avatar do Chat"} className="rounded-full w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{chatPartnerName && chatPartnerName.substring(0, 2).toUpperCase()}</span>
          )}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-purple-800 animate-pulse"></span>
        </motion.button>
      )}


      {/* Caixa de bate-papo */}
      <AnimatePresence>
        {isChatBubbleOpen && (
          <motion.div
            /*className={`fixed bottom-6 right-6 z-50 
              w-full max-w-[calc(90vw-16px)] sm:max-w-sm
              flex flex-col shadow-lg rounded-t-lg
              bg-gray-700 from-blue to-green 
              border-t-2 border-purple
              px-0 sm:px-0
              rounded-bl-none rounded-br-none
              animate__faster 
            `}*/
            className="
              fixed bottom-0 left-1/2 -translate-x-1/2 z-50
              w-full max-w-[calc(100vw-16px)] sm:max-w-md
              flex flex-col
            bg-gray-800 from-[#1e293b] via-[#334155] to-[#0f172a]
              border-t-4 border-blue
              rounded-t-2xl shadow-2xl
              animate__animated animate__fadeInUp
              px-2 sm:px-0
            "
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            <div className="bg-[#0f172a] p-3 rounded-t-2xl flex justify-between items-center border-b border-lightblue relative">
              <span className="font-bold text-gray-300 text-shadow-glow">{chatPartnerName}</span>
              <div className="flex items-center">
                <button
                  onClick={handleMinimizeChat}
                  className="text-blue hover:text-red focus:outline-none mr-2"
                >
                  <Minus className="h-5 w-5 cursor-pointer" /> {/* Ícone de minimizar */}
                </button>
                <button onClick={() => setIsChatBubbleOpen(false)} className="text-lightblue hover:text-red focus:outline-none">
                  <X className="h-5 w-5 cursor-pointer" />
                </button>
              </div>
            </div>
            <div ref={chatContainerRef} className="p-3 overflow-y-auto h-64 flex-grow">
              {activeChats[isChatBubbleOpen]?.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-2 p-3 rounded-md ${
                    msg.sender === playerName
                      ? 'bg-blue text-right text-gray-300 self-end shadow-md'
                      : 'bg-blue text-left text-gray-300 shadow-md'
                  }`}
                >
                  <span className="text-xs italic text-gray-300">{msg.sender}:</span>
                  <p className="font-medium">{msg.text}</p>
                </div>
              ))}
              {typingIndicator[isChatBubbleOpen] && (
                <div className="text-left italic text-blue">
                  <DotLoader color="#a0aec0" size={15} /> <span className="ml-1">Digitando...</span>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-purple-800 flex items-center">
              <input
                type="text"
                className="bg-purple-900 text-gray-300 border border-blue rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-inner"
                placeholder="Enviar mensagem..."
                value={chatInput}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="bg-cyan-500 hover:bg-lightblue text-white text-shadow-glow border border-lightblue font-bold py-2 px-4 rounded-md ml-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
              >
                Enviar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-4xl text-gray-300 font-bold mb-8 mt-72 text-center drop-shadow-md"
      >
        🎮 Jogo para treinar o Francês
      </motion.h1>

      
      <div className="flex flex-col items-center space-y-6">
        <button
            onClick={() => router.push('/results')}
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
          
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between py-3 px-6 rounded-xl border-2 border-lightblue bg-gradient-to-br from-purple-700 to-indigo-800 text-blue shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 text-lg tracking-wide font-semibold text-center cursor-pointer transition-all duration-300 ease-out"
          >
            {theme ? (
              `🎯 ${theme}`
            ) : (
              <span className="flex items-center gap-2">
                
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


        {/* Botão "Frases em Francês" */}
        <div className="w-64 flex flex-col items-center">
          {!isFrasesUnlocked && (
            <p className="text-sm text-gray-400 mb-1 text-center">Selecione uma opção e complete 2 acertos para desbloquear este nível.</p>
          )}
          <motion.button
            className={`flex items-center justify-center py-3 px-6 rounded-md mt-2 font-semibold transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 ${
              isFrasesUnlocked
                ? 'bg-lightblue hover:bg-green cursor-pointer text-white shadow-md'
                : 'bg-gray-900 text-gray-400 cursor-not-allowed shadow-sm'
            }`}
            onClick={handleFrasesClick}
            disabled={!isFrasesUnlocked || isFrasesUnlocking}
            variants={unlockButtonVariants}
            animate={isFrasesUnlocking ? 'unlocking' : 'locked'}
          >
            {isFrasesUnlocked ? <LockOpenIcon className="w-5 h-5 mr-2 text-yellow" /> : <LockClosedIcon className="w-5 h-5 mr-2 " />}
            Frases em Francês
          </motion.button>

          
          {/* Mensagem de bloqueio */}
          <AnimatePresence>
            {showLockMessage && !isFrasesUnlocked && (
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
            {showUnlockFrasesAnimation && (
              <motion.div
                className="absolute top-[-40px] text-green-500 font-bold text-lg"
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

        {/* Botão "Ditados em Francês" */}
        <div className="w-64 flex flex-col items-center relative">
          {!isProverbsUnlocked && (
            <p className="text-sm text-gray-400 mb-1 text-center">Selecione uma opção e complete 1 acerto para desbloquear este nível.</p>
          )}
          <motion.button
            className={`flex items-center justify-center py-3 px-6 rounded-md mt-2 font-semibold transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 ${
              isProverbsUnlocked
                ? 'bg-lightblue hover:bg-green cursor-pointer text-white shadow-md'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-sm'
            }`}
            onClick={handleProverbsClick}
            disabled={!isProverbsUnlocked || isProverbsUnlocking}
            variants={unlockButtonVariants}
            animate={isProverbsUnlocking ? 'unlocking' : 'locked'}
          >
            {isProverbsUnlocked ? <LockOpenIcon className="w-5 h-5 mr-2 text-yellow" /> : <LockClosedIcon className="w-5 h-5 mr-2 " />}
            Ditados em Francês
          </motion.button>

          {/* Mensagem de bloqueio */}
          <AnimatePresence>
            {showLockMessage && !isProverbsUnlocked && (
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
            {showUnlockProverbsAnimation && (
              <motion.div
                className="absolute top-[-40px] text-green-500 font-bold text-lg"
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

        {showRestart && (
          <button
            onClick={() => {
              setRound(r => r + 1)
              setShowRestart(false)
            }}
            className="mt-6 border border-red text-red bg-transparent hover:bg-gray-300 hover:text-white px-4 py-2 rounded shadow transition cursor-pointer"
          >
            ❌ Jogue de novo
          </button>
        )}

      </div>

      {theme && <h2 className="text-2xl text-gray-300 font-semibold mt-4 mb-6 text-center">Opção: {theme}</h2>}

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
                  className="bg-transparent text-black p-4 rounded-2xl flex-grow shadow-2xl max-w-[250px] transition transform hover:scale-105 flex flex-col items-center"
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
                        text-white bg-gradient-to-br from-gray-800 to-lightblue
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
                        <option className='cursor-pointer' key={i} value={opt}>
                          {opt}
                        </option>
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
                      {results[index].correct_word ? (
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
                    className="fixed top-0 left-0 w-full h-full bg-opacity-75 backdrop-blur-md z-40"
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
