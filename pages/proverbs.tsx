/*'use client'*/

import { useEffect, useRef, useState, RefObject, useCallback } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X, Minus, ChevronLeft, Lock } from 'lucide-react'
import { motion , AnimatePresence, useMotionValue, animate, MotionValue} from 'framer-motion'
import { saveProgress } from './proverbs_results'
import { LockClosedIcon, LockOpenIcon, MusicalNoteIcon, GlobeAmericasIcon, CloudIcon, BeakerIcon } from '@heroicons/react/24/solid';
import { io } from 'socket.io-client'
import { DotLoader } from 'react-spinners';
import { Realtime, Message } from 'ably'
import { useSound } from 'use-sound';
import type { RealtimeChannel } from 'ably';
import dynamic from "next/dynamic";
import { BiPlay, BiPause, BiVolumeFull, BiVolumeMute } from 'react-icons/bi';
import { FaSpinner } from 'react-icons/fa';
import Notification from '../Notification'
import { FaLinkedin, FaInstagram, FaFacebook, FaGithub } from 'react-icons/fa';


const FREESOUND_API_KEY = 'SbW3xMpvC1XDTCf9Pesz75rwFKteNYZ84YRcnZwI';


const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });


const groups = ['grupo-1', 'grupo-2', 'grupo-3']


type Result = {
  correct_proverb: boolean
  selected: string
}

type Player = {
  clientId: string
  name: string
  avatarUrl?: string;
}

interface ChatRequest {
  fromClientId: string;
  fromName: string;
  fromAvatar: string;
  toClientId: string;
}

type ChatBoxProps = {
  clientId: string;
  chatPartner: Player;
  channel: RealtimeChannel;
};

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

interface GameProps {}

export default function Game({}: GameProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastSpokenTitleRef = useRef<string | null>(null);
  
  const { data: session, status } = useSession()
  const router = useRouter()

  const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  const [showPlayersOnline, setShowPlayersOnline] = useState(false);
      
  //const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
    
  const [incomingRequest, setIncomingRequest] = useState<ChatRequest | null>(null);
  const [privateChannel, setPrivateChannel] = useState<RealtimeChannel | null>(null);
  const [chatPartner, setChatPartner] = useState<Player | null>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  

  const playerName = session?.user?.name || 'Anônimo';
  const [notificationCount, setNotificationCount] = useState(0);

  const [showLockMessage, setShowLockMessage] = useState(false);

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const [showRestart, setShowRestart] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  
  const [theme, setTheme] = useState('')
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
    
  const [results, setResults] = useState<(Result | null)[]>([]);
  const [speechSpeeds, setSpeechSpeeds] = useState<number[]>(images.map(() => 1.0));

  const [round, setRound] = useState(1);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)
  const [wrongSound, setWrongSound] = useState<HTMLAudioElement | null>(null)
  
  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);
  const [playUnlockSound] = useSound('/sounds/unlock.mp3');

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 }) // canto superior esquerdo
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 130, y: 130 });
  const [visibleModals, setVisibleModals] = useState<Record<string, boolean>>({});
  
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

  const [open, setOpen] = useState(false);
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  const [clientId, setClientId] = useState<string | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [currentSoundUrl, setCurrentSoundUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'results' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRelaxSounds, setShowRelaxSounds] = useState(false);
  const [currentSoundInfo, setCurrentSoundInfo] = useState<any | null>(null); // Para armazenar informações do som atual
  const [showNotification, setShowNotification] = useState<{
    name: string;
    type: "join" | "leave";
  } |null>(null);
  

  useEffect(() => {
    if (showNotification) {
      const timeout = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showNotification]);

    
  useEffect(() => {
      if (selectedTheme) {
        setSearchStatus('searching');
        setErrorMessage(null);
        setCurrentSoundUrl(null);
        setSearchResults([]);
        setCurrentSoundInfo(null);
  
        const query = selectedTheme;
  
        fetch(`https://freesound.org/apiv2/search/text/?query=${query}&token=${FREESOUND_API_KEY}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Erro na busca: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            setSearchResults(data.results);
            if (data.results.length > 0) {
              setSearchStatus('results');
            } else {
              setSearchStatus('results');
              setErrorMessage(`Nenhum som encontrado para "${query}".`);
            }
          })
          .catch(error => {
            console.error("Erro ao buscar sons:", error);
            setErrorMessage("Erro ao buscar sons.");
            setSearchStatus('error');
          })
          .finally(() => {
            setIsSearching(false);
          });
      } else {
        setCurrentSoundUrl(null);
        setIsPlaying(false);
        setSearchStatus('idle');
        setSearchResults([]);
        setErrorMessage(null);
        setCurrentSoundInfo(null);
      }
  }, [selectedTheme]);
  
  useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.muted = isMuted;
      }
  }, [volume, isMuted]);
  
  const handleThemeSelect = (theme: string) => {
      setSelectedTheme(theme);
  };
  
  const loadAndPlaySound = (soundId: number) => {
      fetch(`https://freesound.org/apiv2/sounds/${soundId}/?token=${FREESOUND_API_KEY}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Erro ao obter detalhes do som: ${response.status}`);
          }
          return response.json();
        })
        .then(soundDetails => {
          setCurrentSoundUrl(soundDetails.previews['preview-hq-mp3']);
          setCurrentSoundInfo(soundDetails);
          setIsPlaying(true);
          if (audioRef.current) {
            audioRef.current.play().catch(error => console.error("Erro ao tocar o áudio:", error));
          }
        })
        .catch(error => {
          console.error("Erro ao obter detalhes do som:", error);
          setErrorMessage("Erro ao obter detalhes do som.");
          setSearchStatus('error');
        });
  };
  
  const togglePlay = () => {
      if (currentSoundUrl) {
        if (isPlaying) {
          audioRef.current?.pause();
        } else {
          audioRef.current?.play().catch(error => console.error("Erro ao tocar o áudio:", error));
        }
        setIsPlaying(!isPlaying);
      }
  };
  
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseFloat(event.target.value));
  };
  
  const toggleMute = () => {
      setIsMuted(!isMuted);
  };
  
  const handleSoundEnded = () => {
      if (currentSoundUrl && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => console.error("Erro ao tocar o áudio:", error));
        setIsPlaying(true);
      }
  };
  
  const toggleRelaxSoundsVisibility = () => {
      setShowRelaxSounds(!showRelaxSounds);
      setSelectedTheme(null);
      setCurrentSoundUrl(null);
      setIsPlaying(false);
      setSearchResults([]);
      setCurrentSoundInfo(null);
  };

  // Cria o Ably client assim que clientId estiver disponível
  useEffect(() => {
      if (!clientId) return;
  
      const client = createAblyClient(clientId);
      setAblyClient(client);
  
      return () => {
        client.close();
      };
  }, [clientId]);
  
  
  const hasEnteredRef = useRef(false);
    
  useEffect(() => {
      if (!ablyClient || !clientId || !playerName  || hasEnteredRef.current) return;
    
      const presenceChannel = ablyClient.channels.get("presence-chat");
              
      const avatarUrl = session?.user?.image ?? "";
  
      const handleEnter = (member: any) => {
        if (member.clientId !== clientId) {
          setPlayersOnline((prev) => {
            const alreadyExists = prev.some(p => p.clientId === member.clientId);
            if (alreadyExists) return prev;
            return [...prev, {
              clientId: member.clientId,
              name: member.data?.name ?? "Desconhecido",
              avatarUrl: member.data?.avatarUrl ?? "",
            }];
          });
          
          setShowNotification({ name: member.data?.name ?? "Desconhecido", type: 'join' });
          setNotificationCount((prev) => prev + 1);
          playEnterSound();
        }
      };
  
      const handleLeave = (member: any) => {
        if (member.clientId !== clientId) {
          setPlayersOnline((prev) => prev.filter(p => p.clientId !== member.clientId));
          setShowNotification({ name: member.data?.name ?? "Desconhecido", type: 'leave' });
          setNotificationCount((prev) => prev + 1);
        }
      };
  
      // Primeiro inscreve-se nos eventos
      presenceChannel.presence.subscribe("enter", handleEnter);
      presenceChannel.presence.subscribe("leave", handleLeave);
  
      // ✅ Aguarda a conexão com Ably antes de entrar no canal
      ablyClient.connection.once('connected', () => {
        presenceChannel.presence.enter({ name: playerName, avatarUrl }).then(() => {
          hasEnteredRef.current = true;
  
          presenceChannel.presence.get().then((members) => {
            const players: Player[] = members
              .filter(m => m.clientId !== clientId)
              .map((m) => ({
                clientId: m.clientId,
                name: m.data?.name ?? "Desconhecido",
                avatarUrl: m.data?.avatarUrl ?? "",
              }));
            setPlayersOnline(players);
          });
        });
      });
          
      return () => {
        presenceChannel.presence.leave();
        presenceChannel.presence.unsubscribe("enter", handleEnter);
        presenceChannel.presence.unsubscribe("leave", handleLeave);
        hasEnteredRef.current = false;
      };
  }, [ablyClient, clientId, playerName, session]);
  
    
  const playEnterSound = () => {
      const audio = new Audio('/sounds/login.mp3');
      audio.play().catch((err) => {
        console.warn('Failed to play sound:', err);
      });
  };
   
  
  const playRequestSound = () => {
      const audio = new Audio('/sounds/received_sound.mp3');
      audio.play().catch((err) => {
        console.warn('Failed to play request sound:', err);
      });
  };
  
  useEffect(() => {
      if (status === 'unauthenticated') router.push('/')
  }, [status, router]);


  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

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
      setCorrectSound(new Audio('/sounds/correct.mp3'))
      setWrongSound(new Audio('/sounds/wrong.mp3'))
      setSuccessSound(new Audio('/sounds/success.mp3'));
    }
  }, [])

  
  useEffect(() => {
      if (!ablyClient) return;
      const channel = ablyClient.channels.get("presence-chat");
    
      const fetchOnlinePlayers = async () => {
        const members = await channel.presence.get();
        const players: Player[] = members.map((m) => ({
          clientId: m.clientId,
          name: m.data?.name ?? "Desconhecido",
          avatarUrl: m.data?.avatarUrl ?? "",
        }));
        setPlayersOnline(players);
      };
    
      fetchOnlinePlayers();
    }, [ablyClient, showPlayersOnline]);
  
  
      
    // Enviar chat request
    const sendChatRequest = (toPlayer: Player) => {
      // Checagem de integridade mínima
      if (!ablyClient || !clientId || !toPlayer?.clientId) return;
      
      const request: ChatRequest = {
        fromClientId: clientId!,
        fromName: playerName,
        fromAvatar: session?.user?.image || "",
        toClientId: toPlayer.clientId,
      };
    
      ablyClient?.channels.get("presence-chat").publish("chat-request", request);
    };
  
  
    useEffect(() => {
      if (!ablyClient || !clientId) return;

      const channel = ablyClient?.channels.get("presence-chat");
    
      const handleRequest = (msg: any) => {
        const req: ChatRequest = msg.data;
        if (req.toClientId === clientId) {
          setIncomingRequest(req);
          playRequestSound();
        }
      };
    
      channel?.subscribe("chat-request", handleRequest);
    
      return () => {
        channel?.unsubscribe("chat-request", handleRequest);
      };
    }, [ablyClient, clientId]);
  
  
    const getPrivateChannelName = (id1: string, id2: string) =>
      `private-chat:${[id1, id2].sort().join("-")}`;
    
  
    const acceptRequest = (req: ChatRequest) => {
      const channelName = getPrivateChannelName(req.fromClientId, clientId!);
      const channel = ablyClient?.channels.get(channelName);
    
      if (!channel) return; // impede erro
    
      setChatPartner({
        clientId: req.fromClientId,
        name: req.fromName,
        avatarUrl: req.fromAvatar,
      });
      setPrivateChannel(channel);
      setIncomingRequest(null);
    };
  
  
    const ChatBox = ({ clientId, chatPartner, channel }: ChatBoxProps) => {
      const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
      const [input, setInput] = useState("");
      const [isPartnerTyping, setIsPartnerTyping] = useState(false);
      const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

      useEffect(() => {
        if (!channel || !clientId) return;
  
        const handler = (msg: any) => {
          setMessages((prev) => [...prev, msg.data]);
          new Audio("/sounds/message.mp3").play();
        };
        channel.subscribe("message", handler);
        return () => channel.unsubscribe("message", handler);
      }, [channel, clientId]);
    
      useEffect(() => {
        if (!channel || !clientId) return;
  
        const handler = (msg: any) => {
          if (msg.data.from !== clientId) {
            setIsPartnerTyping(msg.data.isTyping);
          }
        };
        channel.subscribe("typing", handler);
        return () => channel.unsubscribe("typing", handler);
      }, [channel, clientId]);
    
            
      useEffect(() => {
        if (!channel || !clientId || !input) return;
      
        channel?.publish("typing", { from: clientId, isTyping: true });
      
        if (typingTimeout.current) {
          clearTimeout(typingTimeout.current);
        }
      
        typingTimeout.current = setTimeout(() => {
          channel.publish("typing", { from: clientId, isTyping: false });
        }, 1000);
      
        return () => {
          if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
          }
        };
      }, [input, channel, clientId]);
    
  
      const sendMessage = () => {
        if (!input.trim()) return;
        const message = { from: clientId, text: input.trim() };
        channel.publish("message", message);
        setMessages((prev) => [...prev, message]);
        setInput("");
      };


    return (
      <>
        {/* Caixa de bate-papo privado */}
        <div className="fixed bottom-4 right-4 bg-gray-900 rounded-xl border border-blue-500 shadow-xl w-80 z-50">
          <div className="bg-blue-800 text-white p-2 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={chatPartner.avatarUrl} className="w-8 h-8 rounded-full" />
              <span>{chatPartner.name}</span>
            </div>
          </div>
  
          <div className="p-2 max-h-64 overflow-y-auto space-y-1 text-white text-sm">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-md ${
                  msg.from === clientId ? "bg-blue-600 ml-auto text-right" : "bg-gray-700"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
  
          <div className="p-2 flex gap-2">
            {/* Botão de emojis */}
            <button
              onClick={() => setShowPicker(!showPicker)}
              type="button"
              className="text-white text-lg px-2 hover:scale-110"
            >
              😊
            </button>
  
            {/* Campo de entrada */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-800 rounded px-2 py-1 text-white"
              placeholder="Digite..."
            />
  
            {/* Botão de enviar */}
            <button
              onClick={sendMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded"
            >
              Enviar
            </button>
  
            {/* Picker de emojis */}
            {showPicker && (
              <div className="absolute bottom-14 right-2 z-50">
                <Picker
                  theme="dark"
                  onSelect={(emoji: any) => {
                    setInput((prev) => prev + emoji.native);
                    setShowPicker(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
  
        {/* Indicador de digitação */}
        {isPartnerTyping && (
          <div className="text-xs text-gray-300 px-3 py-1 animate-pulse">
            {chatPartner.name} está digitando...
          </div>
        )}
      </>
    )
  }


  // Adicionar voz ao review
  useEffect(() => {
    const currentReview = reviewHistory[currentReviewIndex];
    const currentSpeed = speechSpeeds?.[currentReviewIndex] ?? 1;
    
    if (
      showReviewModal && // <- verifica se o modal está aberto
      currentReview &&
      currentReview.title !== lastSpokenTitleRef.current
    ) {
      speakPortuguese(currentReview.title, currentSpeed);
      lastSpokenTitleRef.current = currentReview.title;
    }
  }, [currentReviewIndex, reviewHistory, speechSpeeds, showReviewModal]);


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
      const correctAnswersInRound = results.filter(res => res?.correct_proverb);
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
      const res = await fetch('/api/generate-proverbs', {
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
          
    const correct_proverb = images[index].title.toLowerCase() === userAnswer.toLowerCase()
    const alreadyCorrect = results[index]?.correct_proverb
      
    if (correct_proverb && !alreadyCorrect && correctSound) correctSound.play()
    if (!correct_proverb && wrongSound) wrongSound.play()
      
    const newResults = [...results]; // agora é um array!
    newResults[index] = { correct_proverb, selected: userAnswer };  
  
    setResults(newResults);
        
      
    // ⏬ Scroll para a próxima imagem ainda não respondida (com pequeno delay)
    setTimeout(() => {
      const nextUnansweredIndex = newResults.findIndex((res, i) => !res && i > index)
      const nextRef = imageRefs.current[nextUnansweredIndex]
      if (nextUnansweredIndex !== -1 && nextRef) {
        nextRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)
        
    const currentCorrectCount = Object.values(newResults).filter((r) => r?.correct_proverb).length;
    setCorrectAnswersCount(currentCorrectCount);
    const totalCount = images.length
    const hasWrong = Object.values(newResults).some(r => r && !r.correct_proverb)
  
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
      const currentRoundCorrect = images.filter((_, i) => newResults[i]?.correct_proverb).map(img => ({
        url: img.url,
        title: img.title,
      }));
      if (currentRoundCorrect.length > 0) {
        setReviewHistory(prev => [...prev, ...currentRoundCorrect]);
      }

      setTimeout(() => {
        const nextGroup = groups.filter(t => t !== theme)[Math.floor(Math.random() * (groups.length - 1))]
        setTheme(nextGroup)
        setRound(r => r + 1)
        setShowCongrats(false)
      }, 3000);
  
      if (successSound) {
        successSound.play();
      }
    }
  };
  

  const isReviewAvailable = availableReviews > 0;

  const speakPortuguese = (text: string, speed: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('A API de Text-to-Speech não é suportada neste navegador.');
      return;
    }
  
    const synth = window.speechSynthesis;
  
    const speak = () => {
      const voices = synth.getVoices();
      const portugueseVoice = voices.find((voice) =>
        ['pt-BR'].includes(voice.lang)
      );
  
      const utterance = new SpeechSynthesisUtterance(text);
      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
      } else {
        console.warn('Voz em português não encontrada. Usando a voz padrão.');
      }
  
      utterance.lang = 'pt-BR'; // força o idioma português
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

      
    
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
      <div className="absolute top-66 left-4 z-50">
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
          <div className="flex items-center gap-2 cursor-pointer mt-4">
            <span className="text-gray-300 font-medium hidden sm:inline">{session.user.name}</span>
            <img src={session.user.image || ''} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-lightblue" />
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

      <div className='relative'>
        {/* Notificação de jogadores online */}
        <div className="fixed top-4 left-4 z-50">
              <button
                  onClick={() => {
                    setShowPlayersOnline((prev) => !prev);
                    setNotificationCount(0); // Zera as notificações
                  }}
                  className="relative border-2 border-lightblue hover:bg-lightblue text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer mt-4"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1h9v-1a6 6 0 01-12 0v-1c0-2.485-2.099-4.5-4-4s-4 2.015-4 4v1z" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-green text-green text-xs rounded-full px-2 py-0.5">
                        {notificationCount}
                    </span>
                  )}
              </button>
        </div>
      
        {/* Botão para mostrar/ocultar sons relaxantes */}
        <div className="fixed top-20 left-4 z-50">
          <button
            onClick={toggleRelaxSoundsVisibility}
            className="relative border-2 border-lightblue hover:bg-purple text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer mt-4"
          >
            <MusicalNoteIcon className="h-6 w-6" />
          </button>
        </div>
      
        
        {showRelaxSounds && (
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 z-50 border-2 border-gray-300 max-h-96 overflow-y-auto w-full sm:w-96"
            style={{
              scrollbarWidth: 'thin', /* Para Firefox */
              scrollbarColor: '#lightblue #374151', /* Para Firefox (thumb track) */
            }}
          >
            <h2 className="text-xl text-gray-300 font-semibold mb-4">Sons Relaxantes <span className='text-lightblue'>(Freesound)</span></h2>

            <div className="flex space-x-4 mb-4">
            <button
                onClick={() => handleThemeSelect('trees')}
                className={`rounded-xl px-2 py-2 text-white font-semibold transition duration-300 ease-in-out ${
                  selectedTheme === 'trees' ? 'bg-lightblue hover:bg-lightblue' : 'bg-gray-700 hover:bg-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer`}
              >
                <GlobeAmericasIcon className="h-5 w-5 mr-2 inline-block text-green" /> Trees
              </button>
              <button
                onClick={() => handleThemeSelect('rain')}
                className={`rounded-xl px-2 py-2 text-white font-semibold transition duration-300 ease-in-out ${
                  selectedTheme === 'rain' ? 'bg-lightblue hover:bg-lightblue' : 'bg-gray-700 hover:bg-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer`}
              >
                <CloudIcon className="h-5 w-5 mr-2 inline-block text-green" /> Rain
              </button>
              <button
                onClick={() => handleThemeSelect('birds')}
                className={`rounded-xl px-2 py-2 text-white font-semibold transition duration-300 ease-in-out ${
                  selectedTheme === 'birds' ? 'bg-lightblue hover:bg-lightblue' : 'bg-gray-700 hover:bg-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer`}
              >
                <BeakerIcon className="h-5 w-5 mr-2 inline-block text-green" /> Birds
              </button>
              {/* Adicione mais temas aqui */}
            </div>

            <div className="mb-4 text-white">
              {selectedTheme && searchStatus === 'searching' && (
                <div className="flex items-center space-x-2">
                  <FaSpinner className="animate-spin text-green" />
                  <span>Buscando sons de <span className='text-green'>{selectedTheme}</span> no Freesound...</span>
                </div>
              )}
              {selectedTheme && searchStatus === 'results' && searchResults.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg text-gray-300 font-semibold mb-2">Resultados da Busca:</h3>
                  <ul>
                    {searchResults.map((sound) => (
                      <li key={sound.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                        <span className="text-blue text-sm">{sound.name}</span>
                        <button
                          onClick={() => loadAndPlaySound(sound.id)}
                          className="p-1 rounded-full bg-lightblue hover:bg-blue text-white focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer"
                        >
                          <BiPlay className="h-4 w-4 text-green" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedTheme && searchStatus === 'results' && searchResults.length === 0 && errorMessage && (
                <span className="text-yellow">{errorMessage}</span>
              )}
              {selectedTheme && searchStatus === 'error' && errorMessage && (
                <span className="text-red">Erro ao buscar: {errorMessage}</span>
              )}
            </div>

            {currentSoundUrl && currentSoundInfo && (
              <div className="mb-4 text-green text-sm">
                <p>Tocando: {currentSoundInfo.name}</p>
                {currentSoundInfo?.user?.username && <p>Autor: {currentSoundInfo.user.username}</p>}
                {currentSoundInfo?.url && (
                  <a href={currentSoundInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Ver no Freesound</a>
                )}
              </div>
            )}

            {currentSoundUrl && (
              <div className="flex items-center space-x-4">
                <audio ref={audioRef} src={currentSoundUrl} loop onEnded={handleSoundEnded} />
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-full bg-lightblue hover:bg-lightblue text-white focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer"
                >
                  {isPlaying ? <BiPause className="h-6 w-6 text-green" /> : <BiPlay className="h-6 w-6 text-green" />}
                </button>

                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="text-white focus:outline-none">
                    {isMuted ? <BiVolumeMute className="h-5 w-5" /> : <BiVolumeFull className="h-5 w-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="rounded-md bg-gray-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {!selectedTheme && (
              <p className="text-gray-400 text-sm">Selecione um tema para buscar sons no Freesound.</p>
            )}

            <button
              onClick={toggleRelaxSoundsVisibility}
              className="absolute top-2 right-2 text-gray-400 hover:text-blue focus:outline-none cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

      </div>
      

      {/* Exibição dos jogadores online */}
      {showPlayersOnline && (
            <div className="absolute top-26 left-4 bg-gray-900 rounded-xl shadow-lg p-4 w-72 z-50 border border-blue-400">
                <h3 className="text-white font-semibold mb-2">Jogadores online</h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                {playersOnline
                    .filter((p) => p.clientId !== clientId)
                    .map((player) => (
                    <li
                        key={player.clientId}
                        className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg hover:bg-gray-700 transition"
                    >
                        <div className="flex items-center space-x-2">
                          <img src={player.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" />
                          <span className="text-white">{player.name}</span>
                        </div>
                        <button
                          onClick={() => sendChatRequest(player)}
                          className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-full"
                        >
                          Bate-papo
                        </button>
                    </li>
                    ))}
                </ul>
            </div>
      )}


      {/* Notificação de solicitação de chat */}
      {incomingRequest && (
            <div className="fixed bottom-4 right-4 bg-gray-800 border border-blue-500 rounded-xl p-4 shadow-xl z-50 animate-bounce-in">
                <div className="flex items-center gap-3 mb-3">
                  <img src={incomingRequest.fromAvatar} className="w-10 h-10 rounded-full" />
                  <span className="text-white font-semibold">
                      {incomingRequest.fromName} quer bater papo!
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                      className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                      onClick={() => acceptRequest(incomingRequest)}
                  >
                      Aceitar
                  </button>
                  <button
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                      onClick={() => setIncomingRequest(null)}
                  >
                      Recusar
                  </button>
                </div>
            </div>
      )}
      

      {/* Caixa de bate-papo privado */}
      {chatPartner && privateChannel && (
        <ChatBox clientId={clientId!} chatPartner={chatPartner} channel={privateChannel} />
      )}


      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-4xl text-gray-300 font-bold mb-8 mt-92 text-center drop-shadow-md"
      >
        🗨️ Ditados comuns em Francês
      </motion.h1>

      <div className="flex flex-col items-center space-y-6">
        <button
            onClick={() => router.push('/proverbs_results')}
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
                              
              {groups.map((t) => (
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
                        text-blue bg-gradient-to-br from-gray-800 to-lightblue
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
                    onClick={() => speakPortuguese(img.title, speechSpeeds[index])}
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
                      {results[index].correct_proverb ? (
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

            <div className="mt-8 flex gap-4 mb-20">
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

            
            {/* Seção de Redes Sociais */}
            <motion.div
              className="absolute bottom-4 left-5 flex flex-col items-start sm:mt-16 mt-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
                  <h3 className="text-md font-bold mb-2 text-blue">
                      Me siga nas redes sociais
                  </h3>
                  <div className="flex items-center space-x-6">
                    <motion.a
                        href="https://www.linkedin.com/in/handy-claude-marie-milliance-95785099/"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaLinkedin size={28} className="text-blue" />
                    </motion.a>
                    <motion.a
                        href="https://www.instagram.com/handyclaudemarie?igsh=aGNieHVpOXIzdjBy"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaInstagram size={28} className="text-pink" />
                    </motion.a>
                    <motion.a
                        href="https://www.facebook.com/handyclaudemarie.milliance"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaFacebook size={28} className="text-lightblue" />
                    </motion.a>
                    <motion.a
                        href="https://github.com/han19githtbr"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FaGithub size={28} className="text-gray-400" />
                    </motion.a>
                  </div>
            </motion.div>
            
            
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

      {/* Notificação flutuante no topo */}
      {showNotification && (
        <Notification
          show={!!showNotification}
          name={showNotification.name}
          type={showNotification.type}
        />
      )}

    </div>
  )
}