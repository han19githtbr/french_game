import { useEffect, useRef, useState, RefObject, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X, Minus, Lock, ChevronDown, ChevronLeft, ChevronRight, Pause, Play, FlagIcon } from 'lucide-react'
import { motion , AnimatePresence, useMotionValue, useTransform, animate, MotionValue} from 'framer-motion'
import { saveProgress } from './results'
import { LockClosedIcon, LockOpenIcon, MusicalNoteIcon, ChevronLeftIcon, ChevronRightIcon, GlobeAmericasIcon, CloudIcon, BeakerIcon, VideoCameraIcon, FilmIcon, LanguageIcon, DeviceTabletIcon, ChatBubbleBottomCenterTextIcon, MapPinIcon, ShoppingCartIcon, TvIcon, MoonIcon, FaceSmileIcon } from '@heroicons/react/24/solid';
import { useSound } from 'use-sound';
import dynamic from "next/dynamic";
import { BiPlay, BiPause, BiVolumeFull, BiVolumeMute } from 'react-icons/bi';
import { FaSpinner, FaTrophy } from 'react-icons/fa';
import { FaLinkedin, FaInstagram, FaFacebook, FaGithub } from 'react-icons/fa';
import { BsEyeFill, BsPlayFill } from 'react-icons/bs';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { youtube_v3 } from '@googleapis/youtube';
//import { io, Socket } from 'socket.io-client';
import { useSocket } from '../lib/socket';
import NotificationBadge from '../components/NotificationBadge';


const DAILY_LIMIT = 10; // Limite diário de vídeos

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

const animalSounds: Record<string, string> = {
  'Le Chien': '/sounds/cachorro.mp3',
  'Jouer avec son chien': '/sounds/cachorro.mp3',
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
  'Un lapin': '/sounds/rabbit.wav',
  'Une vache': '/sounds/cow.mp3',
  'Une sauterelle': '/sounds/grasshopper.mp3',
  'Un loup': '/sounds/wolf.wav',
  'Une baleine': '/sounds/whales.mp3',
  'Un cabrit': '/sounds/goat.mp3',
  'Un dauphin': '/sounds/dolphin.mp3',
  'Un porc': '/sounds/pig.mp3',
  'Un aigle': '/sounds/eagle.mp3',
  'Un poussin': '/sounds/chick.mp3',
}


const familySounds: Record<string, string> = {
  'Rire': '/sounds/laughing.mp3',
  'À la salle de Théâtre': '/sounds/laughing.mp3',
}

const tecnologySounds: Record<string, string> = {
  'Une Salle de cinéma': '/sounds/laughing.mp3',
}


const themesCarrossel = [
  { id: 'tecnology', label: 'Learn', icon: <DeviceTabletIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'language', label: 'Language', icon: <LanguageIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'nature', label: 'Nature', icon: <GlobeAmericasIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'music', label: 'Music', icon: <MusicalNoteIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'food', label: 'Food', icon: <ShoppingCartIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'tourism', label: 'Tourism', icon: <MapPinIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'cartoons', label: 'Cartoons', icon: <FilmIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'english', label: 'English', icon: <FlagIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'meditation', label: 'Meditation', icon: <FaceSmileIcon className="h-5 w-5 inline-block mr-1" /> },
];


const themesSoundCarrossel = [
  { id: 'trees', label: 'Trees', icon: <GlobeAmericasIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'rain', label: 'Rain', icon: <CloudIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'birds', label: 'Birds', icon: <BeakerIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'nature', label: 'Nature', icon: <GlobeAmericasIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'plane', label: 'Plane', icon: <MapPinIcon className="h-5 w-5 inline-block mr-1" /> },
  { id: 'night', label: 'Night', icon: <MoonIcon className="h-5 w-5 inline-block mr-1" /> },
];


type Result = {
  correct_word: boolean
  selected: string
}

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
    //rotate: [0, 5, -5, 0],
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

interface Video {
  id: string;
  name: string;
  url: string;
  user?: { username: string };
  duration?: string;
}

interface Conquest {
  user: string;
  plays: any[]; // Defina um tipo mais específico se souber a estrutura de 'plays'
  views: number;
  timestamp: Date;
  date: string;
}

// Função auxiliar para obter a data atual no formato YYYY-MM-DD
const getFormattedDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


export default function Game({}: GameProps) {
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
  
  const [themeCarrosselIndex, setThemeCarrosselIndex] = useState(0);
  
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
    
  const [results, setResults] = useState<(Result | null)[]>([]);
  const [speechSpeeds, setSpeechSpeeds] = useState<number[]>(images.map(() => 1.0));

  const [round, setRound] = useState(1);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const [correctSound, setCorrectSound] = useState<HTMLAudioElement | null>(null)
  const [wrongSound, setWrongSound] = useState<HTMLAudioElement | null>(null)
  
  const [isFrasesUnlocked, setIsFrasesUnlocked] = useState(false);
  const [showLockMessage, setShowLockMessage] = useState(false);

  const [isProverbsUnlocked, setIsProverbsUnlocked] = useState(false);
  
  const [isFrasesUnlocking, setIsFrasesUnlocking] = useState(false);
  const [isProverbsUnlocking, setIsProverbsUnlocking] = useState(false);
  const [showUnlockFrasesAnimation, setShowUnlockFrasesAnimation] = useState(false);
  const [showUnlockProverbsAnimation, setShowUnlockProverbsAnimation] = useState(false);

  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);
  const [playUnlockSound] = useSound('/sounds/unlock.mp3');
      
  const [reviewHistory, setReviewHistory] = useState<ReviewItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [availableReviews, setAvailableReviews] = useState(0);
  //const reviewIntervalRef: RefObject<ReturnType<typeof setInterval> | null> = useRef(null);
  const reviewIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isReviewUnlocking, setIsReviewUnlocking] = useState(false);
  const [isReviewUnlocked, setIsReviewUnlocked] = useState(false);
  const [showUnlockReviewAnimation, setShowUnlockReviewAnimation] = useState(false);
  const lockRotation = useMotionValue(0);
  const lockY = useMotionValue(0);

  const unlockSound = typeof Audio !== 'undefined' ? new Audio('/sounds/unlock.mp3') : null;

  const [isFlashing, setIsFlashing] = useState(false); // Estado para controlar a animação de piscar
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  const [open, setOpen] = useState(false);
    
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
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  
  const [showWins, setShowWins] = useState(false);

  // Novos estados para a funcionalidade de publicação
  const [showPublishButton, setShowPublishButton] = useState(false);
  const [currentRoundPlays, setCurrentRoundPlays] = useState<any[]>([]); // Armazenar as jogadas da rodada atual
  // Estado para armazenar as conquistas publicadas (simulação de persistência)
  const [publishedConquests, setPublishedConquests] = useState<any[]>([]);
  const [replayPlays, setReplayPlays] = useState<any[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayIntervalId, setReplayIntervalId] = useState<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentConquest, setCurrentConquest] = useState<Conquest | null>(null); // A conquista a ser exibida no modal
  const [showConquestCarousel, setShowConquestCarousel] = useState(false);
  const [selectedConquestIndex, setSelectedConquestIndex] = useState(0);
  const [newConquestCount, setNewConquestCount] = useState(0); // Contador de novas conquistas
  const [hasClickedNotification, setHasClickedNotification] = useState(false);

  const [showYouTubeVideos, setShowYouTubeVideos] = useState(false);
    
  const [selectedThemeVideo, setSelectedThemeVideo] = useState<string | null>(null);
  const [searchStatusVideo, setSearchStatusVideo] = useState<'idle' | 'searching' | 'results' | 'error'>('idle');
  const [searchResultsVideo, setSearchResultsVideo] = useState<Video[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoInfo, setCurrentVideoInfo] = useState<Video | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(4); // Começa com 4 tentativas
    
  const soundListBoxRef = useRef<HTMLDivElement>(null);
  const videoListBoxRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const dropDownPageRef = useRef<HTMLDivElement>(null);

  // NOVOS ESTADOS PARA CONTROLE DOS MODAIS
  const [showUnlockWarningModal, setShowUnlockWarningModal] = useState(false); // Para o aviso de duração do desbloqueio
  const [showLastAttemptWarningModal, setShowLastAttemptWarningModal] = useState(false); // Para o aviso de última tentativa
  const [hasShownUnlockLevelWarning, setHasShownUnlockLevelWarning] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);
  const socket = useSocket();

  const videoRef = useRef<HTMLIFrameElement>(null);


  useEffect(() => {
    if (!socket) return;

    socket.on('newPostNotification', () => {
      setNotificationCount(prev => prev + 1);
    });

    return () => {
      socket.off('newPostNotification');
    };
  }, [socket]);

  const handleClearNotifications = () => {
    setNotificationCount(0);
  };


  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };


  // Ela já garante que currentTime seja resetado ao carregar um novo som.
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setCurrentTime(0); // Reseta o tempo atual ao carregar um novo som
    }
  };


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    // Garante que os segundos tenham sempre 2 dígitos (ex: 05 em vez de 5)
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };


  function formatDuration(duration: string): string {
    const iso8601DurationRegex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = duration.match(iso8601DurationRegex);

    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      const seconds = parseInt(match[3]) || 0;

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      const formattedMinutes = Math.floor(totalSeconds / 60);
      const formattedSeconds = totalSeconds % 60;

      return `${formattedMinutes}:${String(formattedSeconds).padStart(2, '0')}`;
    }
    return 'Duração desconhecida';
  }

  // NOVAS FUNÇÕES PARA ABRIR/FECHAR MODAIS
  const handleCloseUnlockWarningModal = () => {
    setShowUnlockWarningModal(false);
  };

  const handleCloseLastAttemptWarningModal = () => {
    setShowLastAttemptWarningModal(false);
  };


  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0') * 3600;
    const minutes = parseInt(match[2] || '0') * 60;
    const seconds = parseInt(match[3] || '0');
    return hours + minutes + seconds;
  };


  const handleThemeVideoSelect = async (theme: string) => {
    setSelectedThemeVideo(theme);
    setSearchStatusVideo('searching');
    setSearchResultsVideo([]);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      if (data.videos && data.videos.length > 0) {
        // Filtrar vídeos com duração de até 20 minutos (1200 segundos)
        const filteredVideos = data.videos.filter((video: Video) => {
          if (video.duration) {
            const durationInSeconds = parseDuration(video.duration);
            return durationInSeconds <= 1200;
          }
          return true; // Se não houver duração, incluir por padrão (caso raro)
        });
        setSearchResultsVideo(filteredVideos);
        setSearchStatusVideo('results');
      } else {
        setSearchStatusVideo('results');
        setErrorMessage('No videos found for this theme.');
      }
    } catch (error) {
      setSearchStatusVideo('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };


  const handleArrowClick = (direction: 'left' | 'right') => {
    const nextIndex =
      direction === 'left'
        ? (themeCarrosselIndex - 1 + themesCarrossel.length) % themesCarrossel.length
        : (themeCarrosselIndex + 1) % themesCarrossel.length;

    setThemeCarrosselIndex(nextIndex);
    handleThemeVideoSelect(themesCarrossel[nextIndex].id);
  };


  const loadAndPlayVideo = (videoId: string) => {
    const video = searchResultsVideo.find((v) => v.id === videoId);
    if (video) {
      setCurrentVideoUrl(`https://www.youtube.com/watch?v=${videoId}`);
      setCurrentVideoInfo(video);
      setIsPlaying(true);

      // SCROLL AUTOMÁTICO PARA O PLAYER APÓS SELECIONAR UM SOM
      // *** MUDANÇA AQUI: Adicionar setTimeout ***
      setTimeout(() => {
        if (videoListBoxRef.current) {
          // console.log('Tentando rolar para a visualização...'); // Para debug
          videoListBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 0); // Timeout de 0ms para agendar a rolagem após a próxima renderização

    }
  };

  const toggleVideosVisibility = () => {
    setShowYouTubeVideos(!showYouTubeVideos);
  };

  useEffect(() => {
    const storedClicked = localStorage.getItem('hasClickedNotification');
    if (storedClicked === 'true') {
      setHasClickedNotification(true);
    }
  }, [hasClickedNotification]);
  

  
  const [showNotification, setShowNotification] = useState<{
    name: string;
    type: "join" | "leave";
  } | null>(null);
  
  
  useEffect(() => {
    if (showNotification) {
      const timeout = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showNotification]);


  // SEU useEffect ORIGINAL PARA BUSCA POR TEMA - AGORA COM A MUDANÇA PARA CHAMAR O BACKEND

  useEffect(() => {
    if (selectedTheme) {
      setSearchStatus('searching');
      setErrorMessage(null);
      setCurrentSoundUrl(null);
      setSearchResults([]);
      setCurrentSoundInfo(null);
      setIsPlaying(false);

      const query = selectedTheme;

      // *** MUDANÇA AQUI: Chamar o endpoint do seu backend ***
      fetch('/api/freesound', { // Altere para o caminho da sua API Route/Endpoint
        method: 'POST', // Usamos POST para enviar a query no corpo
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }), // Enviando o tema como 'query' para o backend
      })
        .then(response => {
          if (!response.ok) {
            // Lidar com erros retornados pelo seu backend
            throw new Error(`Erro na busca via backend: ${response.status}`);
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
          console.error("Erro ao buscar sons (via backend):", error);
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


  // NOVO useEffect para controlar a reprodução/pausa automática
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && currentSoundUrl) {
        audioRef.current.play().catch(error => {
          console.error("Erro ao tentar tocar o áudio automaticamente:", error);
          // O navegador pode bloquear o autoplay sem interação explícita.
          // Aqui você pode mostrar uma mensagem ao usuário para clicar no play.
          setIsPlaying(false); // Se a reprodução falhar, reseta o estado.
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSoundUrl]); // Reage quando isPlaying ou currentSoundUrl mudam


  const handleThemeSelect = (theme: string) => {
    setSelectedTheme(theme);
    setTimeout(() => {
        if (dropDownPageRef.current) {
          // console.log('Tentando rolar para a visualização...'); // Para debug
          dropDownPageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 0); // Timeout de 0ms para agendar a rolagem após a próxima renderização

  };
 

  const handleArrowSoundClick = (direction: 'left' | 'right') => {
    const nextIndex =
      direction === 'left'
        ? (themeCarrosselIndex - 1 + themesSoundCarrossel.length) % themesSoundCarrossel.length
        : (themeCarrosselIndex + 1) % themesSoundCarrossel.length;

    setThemeCarrosselIndex(nextIndex);
    handleThemeSelect(themesSoundCarrossel[nextIndex].id);
  };

  
  const loadAndPlaySound = (soundId: number) => {
    // A requisição agora vai para o seu endpoint de backend '/api/freesound'
    // e envia o 'soundId' no corpo da requisição.
    fetch('/api/freesound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ soundId }), // Enviando o soundId para o backend
    })
      .then(response => {
        if (!response.ok) {
          // Lidar com erros retornados pelo seu backend
          throw new Error(`Erro ao obter detalhes do som via backend: ${response.status}`);
        }
        return response.json();
      })
      .then(soundDetails => {
        // 'soundDetails' é a resposta que vem do seu backend (que por sua vez veio do Freesound ou do cache)
        setCurrentSoundUrl(soundDetails.previews['preview-hq-mp3']);
        setCurrentSoundInfo(soundDetails);
        setIsPlaying(true);

        // SCROLL AUTOMÁTICO PARA O PLAYER APÓS SELECIONAR UM SOM
        setTimeout(() => {
          if (soundListBoxRef.current) {
            soundListBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 0); // Timeout de 0ms para agendar a rolagem após a próxima renderização
      })
      .catch(error => {
        console.error("Erro ao obter detalhes do som (via backend):", error);
        setErrorMessage("Erro ao obter detalhes do som.");
        setSearchStatus('error');
      });
  };


  const togglePlay = () => {
    if (currentSoundUrl) {
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
    setIsPlaying(false);
    setCurrentTime(0); // Reseta o tempo atual ao fim do som
  };

  const toggleRelaxSoundsVisibility = () => {
    setShowRelaxSounds(!showRelaxSounds);
    setSelectedTheme(null);
    setCurrentSoundUrl(null);
    setIsPlaying(false);
    setSearchResults([]);
    setCurrentSoundInfo(null);
  };


  const toggleShowWins = () => {
    setShowWins(!showWins);
    setShowConquestCarousel(!showConquestCarousel);
    //setHasNewConquest(false);
    setNewConquestCount(0); // Resetar o contador ao abrir o carrossel
    setCurrentConquest(null); // Resetar a conquista selecionada ao abrir/fechar o carrossel
    if (replayIntervalId) {
      clearInterval(replayIntervalId);
      setReplayIntervalId(null);
      setReplayIndex(0);
    }
  };
   
  // Localmente
  
  /*useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    const storedConquests = localStorage.getItem('conquests');
    if (storedConquests) {
      const parsedConquests: Conquest[] = JSON.parse(storedConquests);
      // Filtrar as conquistas para manter apenas as do dia atual
      const currentDate = getFormattedDate();
      const filteredConquests = parsedConquests.filter((conquest: Conquest) => conquest.date === currentDate); // Use a interface Conquest no filtro
      setPublishedConquests(filteredConquests);

    }
  }, [status, router]);*/


  const fetchRecentConquests = async () => {
    try {
      const response = await fetch('/api/conquests/today');
      if (response.ok) {
        const data: Conquest[] = await response.json();
        setPublishedConquests(data);
        console.log('Conquistas do dia carregadas do servidor:', data);
      } else {
        const errorData = await response.json();
        console.error('Erro ao carregar as conquistas do dia:', errorData);
        toast.error('Erro ao carregar as conquistas do dia.', { /* ... */ });
      }
    } catch (error) {
      console.error('Erro ao conectar ao servidor para buscar conquistas:', error);
      toast.error('Erro ao conectar ao servidor.', { /* ... */ });
    }
  };
  
  
  useEffect(() => {
    if (status === 'authenticated') {
      
      fetchRecentConquests();
    } else if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);


  // Salvar as conquistas no localStorage sempre que publishedConquests mudar
  /*useEffect(() => {
    // Adicionar a data atual a cada conquista antes de salvar
    const conquestsWithDate = publishedConquests.map(conquest => ({ ...conquest, date: getFormattedDate() }));
    localStorage.setItem('conquests', JSON.stringify(conquestsWithDate));
  }, [publishedConquests]);*/

   
  const handleUnlockAnimationEnd = (setter: SetterFunction) => {
    setTimeout(() => {
      setter(false);
    }, 4000); // Mantém a animação por 4 segundos
  };
   

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCorrectSound(new Audio('/sounds/correct.mp3'))
      setWrongSound(new Audio('/sounds/wrong.mp3'))
      setSuccessSound(new Audio('/sounds/success.mp3'));
    }
  }, []);
  

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
  

  useEffect(() => {
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // --- Lógica de Carregamento/Persistência (Frases) ---
    const storedFrasesUnlockTime = localStorage.getItem('frasesUnlockTime');
    if (storedFrasesUnlockTime && (now - parseInt(storedFrasesUnlockTime, 10) < ONE_DAY_IN_MS)) {
      if (!isFrasesUnlocked) {
        setIsFrasesUnlocked(true);
        setRemainingAttempts(4); // Resetar tentativas ao desbloquear via persistência
      }
    } else {
      if (isFrasesUnlocked) {
        setIsFrasesUnlocked(false);
        localStorage.removeItem('frasesUnlockTime');
      }
    }

    // --- Lógica de Carregamento/Persistência (Provérbios) ---
    const storedProverbsUnlockTime = localStorage.getItem('proverbsUnlockTime');
    if (storedProverbsUnlockTime && (now - parseInt(storedProverbsUnlockTime, 10) < ONE_DAY_IN_MS)) {
      if (!isProverbsUnlocked) {
        setIsProverbsUnlocked(true);
        setRemainingAttempts(4); // Resetar tentativas ao desbloquear via persistência
        
      }
    } else {
      if (isProverbsUnlocked) {
        setIsProverbsUnlocked(false);
        localStorage.removeItem('proverbsUnlockTime');
      }
    }

    // --- Lógica de Desbloqueio POR PONTUAÇÃO (Frases) ---
    if (correctAnswersCount >= 4) {
      if (!isFrasesUnlocked && !isFrasesUnlocking) {
        setIsFrasesUnlocking(true);
        playUnlockSound();
        setShowUnlockFrasesAnimation(true);
        // REMOVIDO: setShowUnlockWarningModal(true); AQUI para o desbloqueio de Frases
        console.log("Desbloqueando Frases por pontuação. hasShownUnlockLevelWarning:", hasShownUnlockLevelWarning); // Debug
        
        setTimeout(() => {
          setIsFrasesUnlocked(true);
          setIsFrasesUnlocking(false);
          handleUnlockAnimationEnd(setShowUnlockFrasesAnimation);
          localStorage.setItem('frasesUnlockTime', Date.now().toString());
          setRemainingAttempts(4);
        }, 1000);
      }
    }
    // --- Lógica de Desbloqueio POR PONTUAÇÃO (Provérbios) ---
    else if (correctAnswersCount === 2) {
      if (!isProverbsUnlocked && !isProverbsUnlocking) {
        setIsProverbsUnlocking(true);
        playUnlockSound();
        setShowUnlockProverbsAnimation(true);
        
        // AQUI: A condição para mostrar o modal de aviso APENAS se ainda não foi mostrado
        // (isto é, a primeira vez que o usuário atinge 2 acertos NESSA SESSÃO de jogo).
        if (!hasShownUnlockLevelWarning) { 
          setShowUnlockWarningModal(true); // Abre o modal de aviso de duração
          setHasShownUnlockLevelWarning(true); // Marca que o aviso já foi mostrado
          console.log("Desbloqueando Provérbios por pontuação. Aviso de desbloqueio ativado!"); // Debug
        } else {
            console.log("Desbloqueando Provérbios, mas aviso de desbloqueio já foi mostrado nesta sessão (provavelmente pelo localStorage)."); // Debug
        }

        setTimeout(() => {
          setIsProverbsUnlocked(true);
          setIsProverbsUnlocking(false);
          handleUnlockAnimationEnd(setShowUnlockProverbsAnimation);
          localStorage.setItem('proverbsUnlockTime', Date.now().toString());
          setRemainingAttempts(4);
        }, 1000);
      }
    }

    // --- Lógica de Desbloqueio da Revisão (mantenha aqui) ---
    if (correctAnswersCount >= 4) { // Condição para desbloquear a revisão (ex: 3 acertos, ajuste se necessário)
      if (!isReviewUnlocked && !isReviewUnlocking) {
        setIsReviewUnlocking(true);
        setShowUnlockReviewAnimation(true);
                
        playUnlockSound();
        
        setTimeout(() => {
          setIsReviewUnlocked(true);
          setIsReviewUnlocking(false);
          handleUnlockAnimationEnd(setShowUnlockReviewAnimation);
        }, 1000);
      }
    }

  // Dependências do useEffect
    }, [
      correctAnswersCount,
      isFrasesUnlocked,
      isProverbsUnlocked,
      isReviewUnlocked,
      playUnlockSound,
      isFrasesUnlocking,
      isProverbsUnlocking,
      isReviewUnlocking,
      handleUnlockAnimationEnd,
      hasShownUnlockLevelWarning, // ESSA DEPENDÊNCIA É CRÍTICA PARA A LÓGICA
    // animate, lockRotation, lockY // Se usados como dependências
  ]);

  
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
    console.log('Tema sendo enviado:', theme);  
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
    
    const correct_word = images[index].title.toLowerCase() === userAnswer.toLowerCase();
    const alreadyCorrect = results[index]?.correct_word;

    if (correct_word && !alreadyCorrect) { // AQUI É ONDE A CONDIÇÃO COMEÇA
      // Play correct sound (assuming correctSound is defined)
      if (correctSound) correctSound.play();

      // Move as funções de som específicas para dentro deste bloco
      playAnimalSound(images[index].title);
      playFamilySound(images[index].title);
      playTecnologySound(images[index].title);
    }
    
    if (!correct_word && wrongSound) {
      wrongSound.play();
      // Decrementa as tentativas restantes apenas se for um novo erro para esta imagem
      if (!results[index]?.correct_word) {
        setRemainingAttempts(prev => {
          const newAttempts = prev - 1;

          // NOVO: Calcular quantas imagens já foram respondidas nesta rodada
          const currentAnsweredCount = Object.values(newResults).filter(r => r !== undefined).length; // Conta resultados não-nulos/undefined

          // Lógica para exibir o aviso da última tentativa (agora um modal)
          if (newAttempts === 1  && currentAnsweredCount < images.length) { // Se restou apenas 1 tentativa
            setShowLastAttemptWarningModal(true); // Apenas abre o modal, sem timer para fechar
          } else if (newAttempts === 1 && currentAnsweredCount === images.length) {
            console.log("Tentativa final, mas todas as imagens já foram respondidas. Não mostrando aviso de última tentativa.");
          }

          // Se as tentativas se esgotarem, bloqueia tudo
          if (newAttempts <= 0) {
            setIsFrasesUnlocked(false);
            setIsProverbsUnlocked(false);
            // Limpa o localStorage para que fiquem bloqueados permanentemente até um novo desbloqueio
            localStorage.removeItem('frasesUnlockTime');
            localStorage.removeItem('proverbsUnlockTime');
            // Você pode querer mostrar uma mensagem de "Game Over" ou similar aqui
            console.log("Tentativas esgotadas! Frases e Provérbios bloqueados.");
          }
          return newAttempts;
        })
      }
        
    }
    
    const newResults = [...results]; // agora é um array!
    newResults[index] = { correct_word, selected: userAnswer };

    setResults(newResults);

    // Armazenar a jogada atual para a gravação
    setCurrentRoundPlays(prev => [...prev, { image: images[index], answer: userAnswer, correct: correct_word }]);

    // ⏬ Scroll para a próxima imagem ainda não respondida (com pequeno delay)
    setTimeout(() => {
      const nextUnansweredIndex = newResults.findIndex((res, i) => !res && i > index);
      const nextRef = imageRefs.current[nextUnansweredIndex];
      if (nextUnansweredIndex !== -1 && nextRef) {
        nextRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);

    const currentCorrectCount = Object.values(newResults).filter((r) => r?.correct_word).length;
    setCorrectAnswersCount(currentCorrectCount);
    const totalCount = images.length;
    const hasWrong = Object.values(newResults).some(r => r && !r.correct_word);

    // Salvar progresso no localStorage
    saveProgress(currentCorrectCount);

    // Registrar o progresso salvo
    const savedProgress = localStorage.getItem('progress_answers');
    const parsedProgress = savedProgress ? JSON.parse(savedProgress) : [];
    console.log('Progresso Salvo:', { round: parsedProgress.length + 1, correct_word: currentCorrectCount });

    // Se errou alguma imagem, mostra botão para recomeçar
    if (hasWrong) {
      setShowRestart(true);
    }

    if (currentCorrectCount === totalCount) {
      setShowCongrats(true);
      setShowPublishButton(true); // Mostrar o botão de publicação

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
        const nextTheme = themes.filter(t => t !== theme)[Math.floor(Math.random() * (themes.length - 1))];
        setTheme(nextTheme);
        setRound(r => r + 1);
        setShowCongrats(false);
        setShowPublishButton(false); // Esconder o botão após a transição
        setRemainingAttempts(4); // Resetar tentativas ao completar uma rodada com sucesso
        setResults([]);
      }, 10000);

      if (successSound) {
        successSound.play();
      }
    }
  };
  

  // localmente
  /*const handlePublishConquest = () => {
    const videoData: Conquest = {
      user: session?.user?.name || 'Anônimo',
      plays: currentRoundPlays,
      views: 0,
      timestamp: new Date(),
      date: getFormattedDate(),

    };
    setPublishedConquests(prev => [...prev, videoData]);
    setNewConquestCount(prev => prev + 1);
    toast.success('Conquista publicada com sucesso!', {
      position: "top-right", // Onde a notificação aparecerá
      autoClose: 3000, // Tempo em milissegundos para fechar automaticamente
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light", // Ou "dark", se preferir
    });
    setShowPublishButton(false);
    setCurrentRoundPlays([]);
  };*/


  const handlePublishConquest = async () => {
    const videoData: Conquest = {
      user: session?.user?.name || 'Anônimo',
      plays: currentRoundPlays,
      views: 0,
      timestamp: new Date(),
      date: getFormattedDate(),
    };

    try {
      const response = await fetch('/api/conquests/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoData),
      });

      if (response.ok) {
        const data = await response.json();
        //console.log('Conquista publicada com sucesso:', data);
        toast.success('Conquista compartilhada com sucesso!', { position: "top-right", autoClose: 3000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true, draggable: true, progress: undefined, theme: "light" });
        setShowPublishButton(false);
        setCurrentRoundPlays([]);
        
        setNewConquestCount(prev => prev + 1);
        // Call the useEffect hook to re-run the effect
        fetchRecentConquests();
          
        
      } else {
        const errorData = await response.json();
        console.error('Erro ao publicar a conquista:', errorData);
        toast.error('Erro ao publicar a conquista.', { position: "top-right", autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true, draggable: true, progress: undefined, theme: "light" });
      }
    } catch (error) {
      console.error('Erro ao enviar a requisição de publicação:', error);
      toast.error('Erro ao conectar ao servidor.', { position: "top-right", autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true, draggable: true, progress: undefined, theme: "light" });
    }
  };


  const startAutomaticReplay = (plays: any[]) => {
    setReplayPlays(plays);
    setReplayIndex(0);
    stopAutomaticReplay();
    const intervalId = setInterval(() => {
      setReplayIndex(prev => {
        if (prev < plays.length - 1) {
          return prev + 1;
        } else {
          clearInterval(intervalId);
          setReplayIntervalId(null);
          return prev;
        }
      });
    }, 6000); // Ajuste o tempo (em ms) entre as jogadas
    setReplayIntervalId(intervalId);
  };

  
  const stopAutomaticReplay = () => {
    if (replayIntervalId) {
      clearInterval(replayIntervalId);
      setReplayIntervalId(null);
      setReplayIndex(0);
    }
  };

  const closeConquestCarousel = () => {
    setShowConquestCarousel(false);
    setCurrentConquest(null);
    stopAutomaticReplay();
  };
 

  const handleSelectConquest = (index: number) => {
    setSelectedConquestIndex(index);
    setCurrentConquest(publishedConquests[index]);
    incrementViewCount(index);
    startAutomaticReplay(publishedConquests[index].plays);
  };

  // Localmente

  // Função para incrementar o contador de visualizações
  /*const incrementViewCount = (index: number) => {
    const updatedConquests = [...publishedConquests];
    updatedConquests[index].views += 1;
    setPublishedConquests(updatedConquests);
  };*/


  const incrementViewCount = async (index: number) => {
    const conquestToUpdate = publishedConquests[index];
    if (conquestToUpdate && conquestToUpdate._id) { // Certifique-se de que a conquista tem um ID do MongoDB
      const updatedConquests = [...publishedConquests];
      updatedConquests[index].views += 1;
      setPublishedConquests(updatedConquests); // Atualizar o estado local imediatamente para feedback

      try {
        const response = await fetch(`/api/conquests/${conquestToUpdate._id}/views`, {
          method: 'POST',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Contagem de visualizações atualizada no servidor:', data);
          // O estado local já foi atualizado, não precisamos fazer nada aqui,
          // a menos que a resposta do servidor traga alguma informação adicional.
        } else {
          const errorData = await response.json();
          console.error('Erro ao atualizar a contagem de visualizações no servidor:', errorData);
          toast.error('Erro ao atualizar a contagem de visualizações.', { position: "top-right", autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true, draggable: true, progress: undefined, theme: "light" });
          // Em caso de erro, você pode optar por reverter a atualização local
          setPublishedConquests(prev => {
             const revertedConquests = [...prev];
             revertedConquests[index].views -= 1;
             return revertedConquests;
          });
        }
      } catch (error) {
        console.error('Erro ao enviar a requisição de atualização de visualizações:', error);
        toast.error('Erro ao conectar ao servidor.', { position: "top-right", autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true, draggable: true, progress: undefined, theme: "light" });
      }
    } else {
      console.warn('Não foi possível atualizar a contagem de visualizações: ID da conquista não encontrado.');
    }
  };


  const currentReplayPlay = currentConquest?.plays[replayIndex];
    

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

  useEffect(() => {
    if (!synth) return;

    const handleVoicesChanged = () => {
      setVoicesLoaded(true);
    };

    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', handleVoicesChanged);
    } else {
      setVoicesLoaded(true);
    }

    return () => {
      if (synth) {
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        if (timeoutId.current) {
          clearTimeout(timeoutId.current);
        }
      }
    };
  }, [synth]);


  const speakFrench = useCallback((text: string, speed: number) => {
    if (!synth) {
      console.error('A API de Text-to-Speech não é suportada neste navegador.');
      return;
    }

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

    if (!voicesLoaded && synth.getVoices().length === 0) {
      // Timeout para tentar falar mesmo que 'voiceschanged' demore
      timeoutId.current = setTimeout(() => {
        console.warn('Evento voiceschanged demorou muito. Tentando falar com a voz padrão.');
        speak();
      }, 5000); // Ajuste o tempo limite conforme necessário
    } else {
      speak();
    }
  }, [synth, voicesLoaded]);
  

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

  const playFamilySound = (title: string) => {
    if (theme !== 'família') return; // só toca se for o tema "animais"
    const soundPath = familySounds[title]
    if (soundPath) {
      const audio = new Audio(soundPath)
      audio.play().catch(err => console.error('Erro ao tocar som da família:', err))
    }
  }

  const playTecnologySound = (title: string) => {
    if (theme !== 'tecnologia') return; // só toca se for o tema "animais"
    const soundPath = tecnologySounds[title]
    if (soundPath) {
      const audio = new Audio(soundPath)
      audio.play().catch(err => console.error('Erro ao tocar som da tecnologia:', err))
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
    <div className="min-h-screen bg-gray-900 from-gray-900 to-gray-900 text-white flex flex-col items-center p-4 relative mb-6">
      
      {session?.user && (
        <div 
          className="fixed top-4 right-4 z-50 group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2 cursor-pointer mt-4">
            <span className="text-gray-300 font-medium hidden sm:inline">
              {session && session.user && session.user.name
                ? session.user.name.length > 20
                  ? session.user.name.substring(0, 17) + '....'
                  : session.user.name
                : '' // Ou algum outro valor padrão que faça sentido para o seu caso
              }
            </span>
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

        {/* Botão para mostrar/ocultar sons relaxantes */}
        <div className="fixed top-4 left-2 z-50">
          <button
            onClick={toggleRelaxSoundsVisibility}
            className="relative border-2 border-lightblue hover:bg-lightblue text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer mt-4"
          >
            <MusicalNoteIcon className="h-6 w-6 text-blue" />
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
            <h2 className="text-xl text-gray-300 font-semibold mb-4">Sons Relaxantes <span className='text-green'>(Freesound)</span></h2>

            <div className="flex items-center justify-between bg-gray-700 rounded-md px-2 py-1 mb-4 w-full overflow-hidden">
                <button
                  onClick={() => handleArrowSoundClick('left')}
                  className="p-2 text-gray-300 hover:text-green transition cursor-pointer"
                >
                  {/* Setinha animada */}
                  <motion.div
                    animate={{
                      x: [0, 5, 0], // esquerda e direita
                      opacity: [0.8, 1, 0.8], // animação de leve brilho
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-gray-300 flex justify-center items-center"
                  >
                    <ChevronLeft size={32} strokeWidth={1.5} />
                  </motion.div>
                </button>

                <div className="flex-1 text-center">
                  <button
                    className={`py-1 px-4 rounded-md border font-semibold transition duration-300 ease-in-out ${
                      selectedTheme === themesSoundCarrossel[themeCarrosselIndex].id
                        ? 'bg-gray-900 text-gray-200 border-b-green'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-b-green'
                    }`}
                  >
                    {themesSoundCarrossel[themeCarrosselIndex].icon}
                    {themesSoundCarrossel[themeCarrosselIndex].label}
                  </button>
                </div>

                <button
                  onClick={() => handleArrowSoundClick('right')}
                  className="p-2 text-gray-300 hover:text-green transition cursor-pointer"
                >
                  {/* Setinha animada */}
                  <motion.div
                    animate={{
                      x: [0, 6, 0], // esquerda e direita
                      opacity: [0.8, 1, 0.8], // animação de leve brilho
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-gray-300 flex justify-center items-center"
                  >
                    <ChevronRight size={32} strokeWidth={1.5} />
                  </motion.div>
                </button>
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
                        <span className="text-blue text-sm font-thin">
                          {sound.name}
                          {/* Adicione a duração aqui */}
                          {sound.duration && (
                            <span className="ml-2 text-green text-xs">
                              ({Math.floor(sound.duration / 60)}:{('0' + Math.floor(sound.duration % 60)).slice(-2)})
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => loadAndPlaySound(sound.id)}
                          className="p-1 ml-2 rounded-full bg-transparent border-2 border-b-lightblue hover:bg-lightblue text-white focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer"
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
                  <a href={currentSoundInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">Ver no Freesound</a>
                )}

                {currentSoundInfo.duration !== undefined && ( // Garante que a duração está disponível
                  <p className="mt-2 text-white">
                    Tempo restante: <span className="font-semibold">{formatTime(Math.max(0, currentSoundInfo.duration - currentTime))}</span>
                  </p>
                )}
              </div>
            )}

            {currentSoundUrl && (
              <div ref={soundListBoxRef} className="flex items-center space-x-4">
                <audio 
                  ref={audioRef} 
                  src={currentSoundUrl} 
                  loop 
                  onEnded={handleSoundEnded} 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                />
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


        {/* Botão para mostrar/ocultar vídeos no youtube */}
        <div className="fixed top-36 left-2 z-40">
          <button
            onClick={toggleVideosVisibility}
            className="relative border-2 border-lightblue hover:bg-lightblue text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer mt-4"
          >
            <VideoCameraIcon className="h-6 w-6 text-blue" />
          </button>
        </div>


        <>
          {showYouTubeVideos && (
            <div
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 z-50 border-2 border-gray-300 max-h-96 overflow-y-auto w-full sm:w-96"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#lightblue #374151',
              }}
            >
              <h2 className="text-xl text-gray-300 font-semibold mb-4">
                Videos em Francês no: <span className="text-green">Youtube</span>
              </h2>

              {/* AVISO DE LIMITE */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white bg-yellow-900/40 border border-green text-sm px-4 py-2 rounded-lg mb-4 shadow"
              >
                Assista até <span className="font-bold text-green">{DAILY_LIMIT}</span> <span className='text-green font-bold'>vídeos por dia</span> para evitar exceder o limite de visualizações disponíveis.
              </motion.div>
                

              <div className="flex items-center justify-between bg-gray-800 rounded-md px-2 py-1 mb-4 w-full overflow-hidden">
                <button
                  onClick={() => handleArrowClick('left')}
                  className="p-2 text-gray-300 hover:text-green transition cursor-pointer"
                >
                  {/* Setinha animada */}
                  <motion.div
                    animate={{
                      x: [0, 5, 0], // esquerda e direita
                      opacity: [0.8, 1, 0.8], // animação de leve brilho
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-gray-300 flex justify-center items-center"
                  >
                    <ChevronLeft size={32} strokeWidth={1.5} />
                  </motion.div>
                </button>

                <div className="flex-1 text-center">
                  <button
                    className={`py-1 px-4 rounded-md border font-semibold transition duration-300 ease-in-out ${
                      selectedThemeVideo === themesCarrossel[themeCarrosselIndex].id
                        ? 'bg-transparent text-white border-b-green'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-b-green'
                    }`}
                  >
                    {themesCarrossel[themeCarrosselIndex].icon}
                    {themesCarrossel[themeCarrosselIndex].label}
                  </button>
                </div>

                <button
                  onClick={() => handleArrowClick('right')}
                  className="p-2 text-gray-300 hover:text-green transition cursor-pointer"
                >
                  {/* Setinha animada */}
                  <motion.div
                    animate={{
                      x: [0, 6, 0], // esquerda e direita
                      opacity: [0.8, 1, 0.8], // animação de leve brilho
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-gray-300 flex justify-center items-center"
                  >
                    <ChevronRight size={32} strokeWidth={1.5} />
                  </motion.div>
                </button>
              </div>


              <div className="mb-4 text-white">
                {selectedThemeVideo && searchStatusVideo === 'searching' && (
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="animate-spin text-blue" />
                    <span>
                      Buscando videos de <span className="text-blue">{selectedThemeVideo}</span> no Youtube...
                    </span>
                  </div>
                )}
                
                {selectedThemeVideo && searchStatusVideo === 'results' && searchResultsVideo.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg text-gray-300 font-semibold mb-2">Resultados da Busca:</h3>
                    <ul>
                      {searchResultsVideo.slice(0, DAILY_LIMIT).map((video) => (
                        <li key={video.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                          
                          <span className="text-blue text-sm font-thin">
                            {video.name}
                            {/* Exibe a duração se existir */}
                            {video.duration && (
                              <span className="ml-2 text-green text-xs">
                                ({formatDuration(video.duration)})
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => loadAndPlayVideo(video.id)}
                            className="p-1 ml-2 rounded-full bg-transparent border-2 border-lightblue hover:bg-blue-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <BiPlay className="h-4 w-4 text-green" />
                          </button>
                        
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedThemeVideo && searchStatusVideo === 'results' && searchResultsVideo.length === 0 && errorMessage && (
                  <span className="text-yellow-500">{errorMessage}</span>
                )}
                {selectedThemeVideo && searchStatusVideo === 'error' && errorMessage && (
                  <span className="text-red-500">Erro ao buscar: {errorMessage}</span>
                )}
              </div>

              {currentVideoUrl && currentVideoInfo && (
                <div className="mb-4 text-sm">
                  <p className='text-white'>Tocando: {currentVideoInfo.name}</p>
                  {currentVideoInfo?.user?.username && <p className='text-green'>Autor: {currentVideoInfo.user.username}</p>}
                  {currentVideoInfo?.url && (
                    <a href={currentVideoInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
                      Ver no Youtube
                    </a>
                  )}
                </div>
              )}

              {currentVideoUrl && (
                <div ref={videoListBoxRef} className="inline-block items-center space-x-4">
                  {/* Using iframe for YouTube video playback */}
                  <iframe
                    ref={videoRef}
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${currentVideoInfo?.id}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&volume=${volume * 100}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  
                </div>
              )}

              {!selectedThemeVideo && (
                <p className="text-gray-400 text-sm">Selecione um tema para buscar sons no Youtube.</p>
              )}

              <button
                onClick={toggleVideosVisibility}
                className="absolute top-2 right-2 text-gray-400 hover:text-blue focus:outline-none cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
            </div>
          )}
        </>


        {/* Botão para mostrar/ocultar as conquistas e o replay */}
        <div className="fixed top-20 left-2 z-40">
          <button
            onClick={toggleShowWins}
            className="relative border-2 border-lightblue hover:bg-lightblue text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer mt-4 animate-pulse-slow"
          >
            <FaTrophy className="h-6 w-6 text-yellow" />
            {newConquestCount > 0 && (
              <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-green text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold animate-pulse-slow">
                {newConquestCount}
              </span>
            )}
          </button>
        </div>

            
        {/* Carrossel de Miniaturas de Conquistas */}
        {showConquestCarousel && publishedConquests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-40 bg-black bg-opacity-70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className="bg-white rounded-2xl p-8 shadow-2xl text-center w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4">As Conquistas mais recentes</h3>
              <div className="overflow-x-auto whitespace-nowrap scroll-smooth" ref={carouselRef} style={{ display: 'flex', gap: '10px' }}>
                {publishedConquests.map((conquest, index) => (
                  <motion.div
                    key={index}
                    onClick={() => handleSelectConquest(index)} // Ao clicar na miniatura, seleciona a conquista para replay
                    className={`w-40 h-32 rounded-md shadow-md cursor-pointer overflow-hidden relative ${
                      index === selectedConquestIndex ? 'border-2 border-blue' : 'hover:scale-105 transition-transform duration-300'
                    }`}
                    style={{ background: '#eee', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
                  >
                    {/* Exibir uma miniatura da primeira jogada ou um ícone representativo */}
                    {conquest.plays[0]?.image?.url ? (
                      <img
                        src={conquest.plays[0].image.url}
                        alt={`Miniatura da Conquista de ${conquest.user}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FaTrophy className="text-3xl text-yellow" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-1 text-xs text-center">
                      <span className='text-green text-md font-bold'>{conquest.user.length > 20 ? conquest.user.substring(0, 17) + '....' : conquest.user}</span>
                    </div>
                    <div className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-md p-1 flex items-center text-xs ">
                      <BsEyeFill className="w-3 h-3 mr-1 text-green" />
                      <span>{conquest.views}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button
                onClick={closeConquestCarousel}
                className="mt-6 bg-gray-800 hover:bg-lightblue text-white font-bold py-1 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
        
        
        {showConquestCarousel && currentConquest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 backdrop-blur-md"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closeConquestCarousel();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                className="bg-gray-900 rounded-2xl p-6 shadow-2xl text-center text-white w-full max-w-md" // Fundo escuro e largura máxima
              >
                <h3 className="text-sm font-bold mb-3">Replay de: <span className='text-green'>{currentConquest.user}</span></h3>
                {currentReplayPlay ? (
                  <div className="mb-3 relative rounded-md overflow-hidden shadow-md"> {/* Container com overflow hidden para as bordas */}
                    <img
                      src={currentReplayPlay.image.url}
                      alt={currentReplayPlay.image.title}
                      className="w-full h-auto block" // Largura total e altura automática
                      style={{ maxHeight: '400px', objectFit: 'contain' }} // Altura máxima e manter proporção
                    />
                    <div className="absolute top-2 mb-4 right-2 bg-gray-800 bg-opacity-70 text-white rounded-md p-1 flex items-center text-xs animate-pulse-slow">
                      <BsEyeFill className="w-4 h-4 mr-1 text-green" />
                      <span>{currentConquest?.views}</span>
                    </div>
                    <div className="mt-2 text-sm">
                        Sua resposta: <span className={currentReplayPlay.correct ? 'text-green font-semibold' : 'text-red font-semibold'}>
                        {currentReplayPlay.answer}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Resposta correta: <span className="text-green">{currentReplayPlay.image.title}</span>
                    </div>
                    {replayIndex === currentConquest.plays.length - 1 && (
                      <div className="flex justify-center gap-3 mt-4 mb-6">
                        <button
                          onClick={closeConquestCarousel}
                          className="flex items-center bg-transparent border-2 border-e-red hover:bg-gray-500 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline cursor-pointer text-sm"
                        >
                          <X className='text-red mr-2' size={20} />
                          Fechar
                        </button>
                        <button
                          onClick={() => startAutomaticReplay(currentConquest.plays)}
                          className="flex items-center bg-transparent border-2 border-e-lightblue hover:bg-gray-500 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline cursor-pointer text-sm"
                        >
                          <Play className='text-blue mr-2' size={20} />
                          Assistir Novamente
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 text-sm">Fim da reprodução!</p>
                )}
              </motion.div>
            </motion.div>
        )}
        <ToastContainer />
      
      </div>
      
      
      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-3xl text-gray-300 font-thin mb-8 mt-72 text-center drop-shadow-md"
      >
        Jogo para treinar o Francês
      </motion.h1>

      
      <div className="flex flex-col items-center space-y-6">
        <button
            onClick={() => router.push('/results')}
            className="w-68 border-2 border-e-lightblue bg-gradient-to-br text-blue from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 text-lg cursor-pointer flex items-center justify-center space-x-3"
        >
          <div className="flex items-center">
            <svg
              className="animate-spin h-6 w-6 text-blue"
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
            disabled={showRestart}
            className={`
              w-full flex items-center justify-between py-3 px-6 rounded-md border-2 border-e-lightblue shadow-lg 
              ${showRestart 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-500 shadow-none' // Estilos quando desabilitado
                : 'bg-gradient-to-br text-blue shadow-purple-500/40 hover:shadow-xl hover:shadow-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 cursor-pointer' // Estilos normais
              }
              text-lg tracking-wide font-semibold text-center transition-all duration-300 ease-out
            `}
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
            {/* AQUI ESTÁ O AJUSTE: Renderização condicional para o ChevronDown */}
            {!showRestart && ( // A seta só aparece se showRestart for false
              <motion.div
                animate={{
                  y: [0, 5, 0], // sobe e desce
                  opacity: [0.8, 1, 0.8], // animação de leve brilho
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-green flex justify-center items-center"
              >
                <ChevronDown size={32} strokeWidth={2.5} />
              </motion.div>
            )}
          </button>

          {/* Lista de opções */}
          {open && (
            <ul className="absolute mt-2 w-full rounded-xl bg-gray-900 shadow-lg border-2 border-e-lightblue max-h-72 overflow-y-auto custom-scrollbar z-10">
              
              {/* Opção padrão */}
              <li
                onClick={() => {
                  setTheme('');
                  setOpen(false);
                }}
                className="flex items-center justify-start gap-3 px-8 py-3 hover:bg-lightblue text-gray-400 text-lg font-semibold cursor-pointer transition-all duration-300"
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
                    animate={{
                      x: [0, 5, 0], // sobe e desce
                      opacity: [0.8, 1, 0.8], // animação de leve brilho
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-green flex justify-center items-center"
                  >
                    <ChevronRight size={32} strokeWidth={2.5} />
                  </motion.div>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </li>
              ))}
            </ul>
          )}
        </div>


        <div className="relative">
          <button 
            onClick={() => router.push('/classes')} 
            className="w-64 bg-transparent border border-green hover:border-gray-100 text-green animate-pulse-slow px-7 py-1 rounded-lg text-lg font-medium transition-colors relative cursor-pointer"
          >
            <span>Curiosidades!</span>
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>
        </div>


        {/* Botão "Frases em Francês" */}
        <div className="w-64 flex flex-col items-center">
          {!isFrasesUnlocked && (
            <p className="text-sm text-gray-400 mb-1 text-center">Selecione uma opção e complete 4 acertos para desbloquear este nível.</p>
          )}
          <motion.button
            className={`flex items-center justify-center py-3 px-7 rounded-md mt-2 font-semibold transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 shadow-[0_0_15px_rgba(0,255,255,0.6)] hover:shadow-[0_0_25px_rgba(0,255,255,0.8)]
                        active:scale-95
                        focus:ring-neon-pink focus:ring-offset-2 focus:ring-offset-gray-900
                        animate-pulse-slow ${
              isFrasesUnlocked
                ? 'bg-gray-900 border-2 border-e-green hover:bg-lightblue cursor-pointer text-white shadow-md '
                : 'bg-gray-900 text-gray-400 border border-gray-400 cursor-not-allowed shadow-sm'
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
            <p className="text-sm text-gray-400 mb-1 text-center">Selecione uma opção e complete 2 acertos para desbloquear este nível.</p>
          )}
          <motion.button
            className={`flex items-center justify-center py-3 px-6 rounded-md mt-4 font-semibold transition duration-300 ease-in-out focus:outline-none animate-pulse-slow ${
              isProverbsUnlocked
                ? 'bg-gray-900 border-2 border-e-green hover:bg-lightblue cursor-pointer text-white shadow-md'
                : 'bg-gray-900 text-gray-400 border border-gray-400 cursor-not-allowed shadow-sm'
            }`}
            onClick={handleProverbsClick}
            disabled={!isProverbsUnlocked || isProverbsUnlocking}
            variants={unlockButtonVariants}
            animate={isProverbsUnlocking ? 'unlocking' : 'locked'}
          >
            {isProverbsUnlocked ? <LockOpenIcon className="w-5 h-5 mr-2 text-yellow" /> : <LockClosedIcon className="w-5 h-5 mr-2 " />}
            Ditados em Francês
          </motion.button>


          {/* Corações de Tentativas */}
          <div className="flex justify-center mt-5 space-x-4">
            <span className='text-yellow font-semibold'>Vidas:</span>
            {[...Array(4)].map((_, i) => (
              <svg
                key={i}
                className={`w-6 h-6 transition-colors duration-300 ${
                  i < remainingAttempts ? 'text-green animate-pulse' : 'text-gray-700'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            ))}
          </div>

          
          {/* --- Modal de Aviso de Duração do Desbloqueio --- */}
          {showUnlockWarningModal && (
            <div className="modal-overlay z-40">
              <div className="modal-content unlock-warning">
                <button className="modal-close-button" onClick={handleCloseUnlockWarningModal}>
                  &times;
                </button>
                <div className="typing">
                  🎉Parabéns! Você desbloqueiou um nível, cada desbloqueio dura um dia, então aproveite!.
                </div>
              </div>
            </div>
          )}

          {/* --- Modal de Aviso de Última Tentativa --- */}
          {showLastAttemptWarningModal && (
            <div className="modal-overlay">
              <div className="modal-content last-attempt-warning">
                <button className="modal-close-button" onClick={handleCloseLastAttemptWarningModal}>
                  &times;
                </button>
                <div className="typing-last-attempt">
                  Você tem mais uma tentativa, acerte ou jogue de novo!
                </div>
              </div>
            </div>
          )}

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
              setShowRestart(false);
              setRemainingAttempts(4);
              setResults([]);
            }}
            className="mt-6 border border-e-red text-red bg-transparent hover:bg-lightblue hover:text-white px-4 py-2 rounded shadow transition cursor-pointer"
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
          <div ref={dropDownPageRef} className="text-center text-lg text-gray-300 animate-pulse">🔍 Procurando imagens...</div>
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
                        w-full p-4 rounded-xl border-2 border-neon-blue
                        bg-gradient-to-br from-gray-900 to-neon-blue
                        text-white font-bold text-lg tracking-wide
                        appearance-none cursor-pointer
                        shadow-[0_0_15px_rgba(0,255,255,0.6)] hover:shadow-[0_0_25px_rgba(0,255,255,0.8)]
                        active:scale-95
                        transition-all duration-300 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-neon-pink focus:ring-offset-2 focus:ring-offset-gray-900
                        animate-pulse-slow
                        sm:p-3 sm:text-base
                        touch-manipulation
                      `}
                      onChange={e => checkAnswer(index, e.target.value)}
                      disabled={!!results[index]}
                    >
                      <option value="" className="bg-gray-900 text-white font-semibold cursor-pointer">✅ Selecione</option>
                      {img.options.map((opt: string, i: number) => (
                        <option
                          className="bg-gray-900 text-white font-semibold hover:bg-neon-blue active:bg-neon-pink transition-colors duration-200 "
                          key={i}
                          value={opt}
                        >
                          {opt}
                        </option>
                      ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <motion.div
                        animate={{
                          y: [0, 5, 0], // sobe e desce
                          opacity: [0.8, 1, 0.8], // animação de leve brilho
                        }}
                        transition={{
                          duration: 0.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className={`text-white flex justify-center items-center ${results[index] ? 'hidden' : ''}`} // Adiciona 'hidden' se a resposta já foi selecionada
                      >
                        <ChevronDown size={28} strokeWidth={2.5} />
                      </motion.div>
                    </div>
                    {results[index] && (
                      <div className="w-full text-center font-bold text-lg tracking-wide text-white p-4">
                        {Object.values(results[index])[0]} {/* Exibe o valor da opção selecionada */}
                      </div>
                    )}
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
                      min="0.1"
                      max="2"
                      step="0.01"
                      value={speechSpeeds[index]}
                      onChange={(e) => handleSpeedChange(index, parseFloat(e.target.value))}
                      className="w-34 h-3 rounded-full bg-transparent border-1 border-green cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-lightblue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
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

            <div className="mt-8 flex gap-4 mb-20">
              <div className="relative">
                <motion.button
                  onClick={handleOpenReview}
                  disabled={!isReviewUnlocked || reviewHistory.length === 0}
                  className={`border flex items-center justify-center py-2 px-8 rounded-xl transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 ${
                    isReviewUnlocked && reviewHistory.length > 0
                      ? 'border-blue hover:border-green hover:text-white cursor-pointer text-blue animate-pulse-slow'
                      : 'border-gray-300 bg-gray-800 text-gray-400 cursor-not-allowed animate-pulse-slow'
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
                      className={`absolute top-[-10px] right-[-10px] bg-green text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-sm font-bold animate-pulse-slow ${isFlashing ? 'animate-ping-once' : ''}`}
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
                        href="https://www.instagram.com/frances_com_tres_nativos/"
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
                    <div className="flex justify-between items-center w-full mt-2 px-2">
                      <button
                        onClick={handlePauseResumeReview}
                        className="flex items-center gap-2 bg-transparent border-2 border-e-lightblue hover:bg-lightblue/80 text-white px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        {isReviewPaused ? <Play size={20} /> : <Pause size={20} />}
                        {isReviewPaused ? 'Continuar' : 'Pausar'}
                      </button>

                      <button
                        onClick={handleCloseReview}
                        className="flex items-center gap-2 bg-transparent hover:bg-red border-2 border-e-red text-white px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        <X size={20} />
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
          initial={{ opacity: 0.3, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 flex items-center justify-center z-100 bg-transparent bg-opacity-90 backdrop-blur-md" // Adicionado backdrop-blur-md para o efeito de sobreamento
        >
          <motion.div
            className="bg-white text-green rounded-2xl p-8 shadow-2xl text-center text-3xl font-bold animate-pulse"
            style={{
              boxShadow: '0 0 40px rgba(255, 255, 0, 0.9)', // Adicionado brilho amarelo
              textShadow: '0 0 10px rgba(255, 255, 0, 0.9)', // Adicionado brilho no texto
            }}
            initial={{ opacity: 0.5, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            onAnimationComplete={() => {
              if (successSound) {
                successSound.play();
              }
            }}
          >
            🎉 Parabéns! Você acertou tudo! 🎉
          </motion.div>
                  
        </motion.div>
      )}

            
      {showPublishButton && (
        <motion.div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50" // Posicionado na parte inferior
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <motion.button
            onClick={handlePublishConquest}
            className="bg-transparent border-2 border-e-green from-lightblue to-blue hover:from-pink hover:to-yellow text-white font-semibold py-2 px-7 rounded-xl shadow-lg animate-pulse focus:outline-none focus:ring-2 focus:ring-purple cursor-pointer"
          >
            Compartilhar conquista
          </motion.button>
        </motion.div>
      )}
      
    </div>
  )
}