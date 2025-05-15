import { signIn, useSession, getProviders } from 'next-auth/react'
import { useRouter } from 'next/router'
import { motion, Transition } from 'framer-motion';
import { useState, useEffect } from 'react';
//import { cn } from "@/lib/utils";
import { cn } from '../lib/utils';
import Image from 'next/image';

const ADMIN_EMAIL = 'milliance23@gmail.com';


const DAILY_ACCESS_KEY = 'frenchLearningDailyAccess';
const LAST_RESET_KEY = 'frenchLearningLastReset';
const PROVERBS_KEY = 'frenchLearningProverbs';
const LAST_PROVERB_DATE_KEY = 'frenchLearningLastProverbDate';


interface Proverb {
  french: string;
  portuguese: string;
}


interface DotProps {
  transitionOverride?: Transition;
  style?: React.CSSProperties;
}


const frenchProverbs: Proverb[] = [
  { french: "Petit à petit, l'oiseau fait son nid.", portuguese: "Pouco a pouco, as coisas vão dando certo." },
  { french: "Il ne faut pas mettre la charrue avant les bœufs.", portuguese: "Não coloque a carroça na frente dos bois." },
  { french: "Tous les chemins mènent à Rome.", portuguese: "Existem maneiras diferentes de alcançar um mesmo objetivo." },
  { french: "Mieux vaut tard que jamais.", portuguese: "Melhor tarde do que nunca." },
  { french: "Qui vivra verra.", portuguese: "Quem viver verá." },
  { french: "L'habit ne fait pas le moine.", portuguese: "Não julgue pelas aparências." },
  { french: "Pierre qui roule n'amasse pas mousse.", portuguese: "Pedra que rola não cria musgo." },
  { french: "Il faut battre le fer tant qu'il est chaud.", portuguese: "Tem que aproveitar a oportunidade enquanto é possível." },
  { french: "Rien ne sert de courir, il faut partir à point.", portuguese: "Não adianta correr, é preciso sair na hora certa." },
  { french: "On ne change pas une équipe qui gagne.", portuguese: "Não tente modificar o que está dando certo." },
  { french: "À bon entendeur, salut!", portuguese: "A bom entendedor, meia palavra basta!" },
  { french: "Telle mère, telle fille", portuguese: "Se trata de uma filha que herdou traços de personalidade da mãe" },
  { french: "Tel père, tel fils", portuguese: "Se trata de um filho que herdou traços de personalidade do pai" },
  { french: "À bon vin point d'enseigne", portuguese: "O que é valioso não precisa ser recomendado" },
  
];

const getDayName = (date: Date) => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};


const Dot: React.FC<DotProps> = ({ transitionOverride, style }) => (
  <motion.span
    className="inline-block h-2 w-2 rounded-full bg-gray-300 ml-1"
    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.8, 1] }}
    transition={transitionOverride || { duration: 0.6, repeat: Infinity, repeatType: 'loop' }}
    style={style}
  />
);

const AnimatedLoadingDots = () => (
  <div className="inline-flex items-center ml-2">
    <Dot />
    <Dot transitionOverride={{ duration: 0.6, repeat: Infinity, repeatType: 'loop', delay: 0.2 }} style={{ marginLeft: '0.4rem' }} />
    <Dot transitionOverride={{ duration: 0.6, repeat: Infinity, repeatType: 'loop', delay: 0.4 }} style={{ marginLeft: '0.4rem' }} />
  </div>
);


export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()
  const title = "Aprenda Francês jogando";
  const titleGoogle = "Entrar com conta Google";
  const titleAdmin = 'Entrar como administrador';
  const [animatedTitle, setAnimatedTitle] = useState("");
  const [animatedTitleGoogle, setAnimatedTitleGoogle] = useState("");
  const [animatedTitleAdmin, setAnimatedTitleAdmin] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dailyAccessCount, setDailyAccessCount] = useState(0);
  const [dayName, setDayName] = useState('');
  const [proverb, setProverb] = useState<Proverb | null>(null);
  const [loadingDots, setLoadingDots] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, any> | null>(null);


  useEffect(() => {
    const fetchProviders = async () => {
      const fetchedProviders = await getProviders();
      setProviders(fetchedProviders);
    };

    fetchProviders();
  }, []);


  useEffect(() => {
    const resetDailyAccessIfNeeded = () => {
      const today = new Date();
      const todayDateString = today.toDateString();
      const lastReset = localStorage.getItem(LAST_RESET_KEY);

      if (lastReset !== todayDateString) {
        localStorage.removeItem(DAILY_ACCESS_KEY);
        localStorage.setItem(LAST_RESET_KEY, todayDateString);
        setDailyAccessCount(0);
      } else {
        const storedCount = localStorage.getItem(DAILY_ACCESS_KEY);
        setDailyAccessCount(storedCount ? parseInt(storedCount, 10) : 0);
      }
      setDayName(getDayName(today));
    };

    resetDailyAccessIfNeeded();
  }, []);


  useEffect(() => {
    if (!session) {
      const intervalId = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % title.length);
      }, 100); // Ajuste a velocidade do brilho (ms)
      
      const proverbIntervalId = setInterval(() => {
        const randomProverbIndex = Math.floor(Math.random() * frenchProverbs.length);
        setProverb(frenchProverbs[randomProverbIndex]);
      }, 10000);

      // Define o provérbio inicial
      const initialProverbIndex = Math.floor(Math.random() * frenchProverbs.length);
      setProverb(frenchProverbs[initialProverbIndex]);
      
      return () => {
        clearInterval(intervalId);
        clearInterval(proverbIntervalId);
      };
    }
  }, [session, title.length]);


  useEffect(() => {
    if (!session) {
      let newAnimatedTitle = "";
      let animatedTitleGoogle = "";
      let newAnimatedTitleAdmin = '';
      
      for (let i = 0; i < title.length; i++) {
        newAnimatedTitle += (i === currentIndex) ?
          `<span style="color: lightblue; text-shadow: 0 0 14px lightblue;">${title[i]}</span>` :
          `<span style="color: gray;">${title[i]}</span>`;
      }
      setAnimatedTitle(newAnimatedTitle);
    
      for (let i = 0; i < titleGoogle.length; i++) {
        animatedTitleGoogle += (i === currentIndex) ?
          `<span style="color: lightblue; text-shadow: 0 0 14px lightblue;">${titleGoogle[i]}</span>` :
          `<span style="color: gray;">${titleGoogle[i]}</span>`;
      }
      setAnimatedTitleGoogle(animatedTitleGoogle);
    
      for (let i = 0; i < titleAdmin.length; i++) {
        newAnimatedTitleAdmin +=
          i === currentIndex
            ? `<span style="color: lightblue; text-shadow: 0 0 14px lightblue;">${titleAdmin[i]}</span>`
            : `<span style="color: gray;">${titleAdmin[i]}</span>`;
      }
      setAnimatedTitleAdmin(newAnimatedTitleAdmin);
    } else {
      setAnimatedTitle(title);
      setAnimatedTitleGoogle(titleGoogle);
      setAnimatedTitleAdmin(titleAdmin);
    }
    
  }, [currentIndex, session, title, titleGoogle]);


  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingDots((prevDots) => {
          if (prevDots.length < 3) {
            return prevDots + '.';
          } else {
            return '';
          }
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setLoadingDots('');
    }
  }, [isLoading]);


  /*const handleSignInClick = async () => {
    setIsLoading(true);
    const newCount = dailyAccessCount + 1;
    setDailyAccessCount(newCount);
    localStorage.setItem(DAILY_ACCESS_KEY, newCount.toString());
    await signIn('google');
    setIsLoading(false);
  };*/


  const handleAdminSignInClick = async () => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });

    const data = await res.json();

    if (data.success) {
      // Se a API retornar sucesso, chame signIn no frontend com o provider 'credentials'
      signIn('credentials', { email: ADMIN_EMAIL, redirect: true, callbackUrl: '/home' });
    } else {
      alert(data.message || 'Falha ao verificar administrador.');
    }
      
  };


  const buttonStyle =
    'flex items-center gap-3 bg-transparent hover:bg-gray-900 font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-xl transition duration-300 cursor-pointer w-full sm:w-auto'; // Adicionamos w-full e sm:w-auto

  const googleButtonStyle = `border border-blue text-blue hover:text-white ${buttonStyle}`;
  const adminButtonStyle = `border border-green text-green hover:text-white ${buttonStyle}`;


  if (session) {
    router.push('/game')
    return null
  }


  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-pink-500 text-white">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center w-full px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={cn("bg-white bg-opacity-10 rounded-xl shadow-lg p-4 mb-6", "backdrop-blur-md ")}>
          <h2 className={cn("text-lg font-bold mb-2", "text-gray-300", "sm:text-xl md:text-2xl", "tracking-wide")}>
            Ditados usados no dia a dia!
          </h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="space-y-2"
          >
            <p className={cn("text-md italic", "text-white", "sm:text-lg md:text-xl", "leading-relaxed", "font-serif")}>
              {proverb ? `"${proverb.french}"` : "Carregando provérbio..."}
            </p>
            {proverb && (
              <p className={cn("text-sm italic", "text-gray-300", "sm:text-base md:text-lg", "text-center",)}>
                {proverb.portuguese}
              </p>
            )}
          </motion.div>
          <motion.div
            className="mt-4 text-xs text-gray-100 font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            Fonte: Ditados Franceses
          </motion.div>
        </motion.div>
              
      </div>
            
      <h1
        className="text-2xl font-bold mt-94 mb-8 text-center"
        dangerouslySetInnerHTML={{ __html: animatedTitle }}
      />
            
      <div className="mt-10 mb-10 flex flex-col items-center space-y-4 sm:space-y-6">
        
        {providers?.google && (
          <button
            onClick={() => signIn('google')}
            className={googleButtonStyle}
          >
            <svg
              className="w-8 h-8 mr-2"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 148.3V98.7c0-27-22-48.3-48.8-48.3H48.8C21.8 49.7 0 71 0 98.8v414.4c0 27.8 21.8 49.7 48.8 49.7h390.4c26.8 0 48.8-22 48.8-49.7V170.3H246.4l-20.4 30.9h174v154.4h-72.4l-20.4 30.9H488zM121.6 313.1c0-13.8 11.2-25 25-25h180.8c13.8 0 25 11.2 25 25v64.3c0 13.8-11.2 25-25 25H146.6c-13.8 0-25-11.2-25-25V313.1zM244 248.9c-20.4 0-36.8-16.4-36.8-36.8s16.4-36.8 36.8-36.8c20.4 0 36.8 16.4 36.8 36.8s-16.4 36.8-36.8 36.8z"
              />
            </svg>
            <span dangerouslySetInnerHTML={{ __html: animatedTitleGoogle }} />
            {isLoading && <AnimatedLoadingDots />}
          </button>
        )}

        <button
          onClick={handleAdminSignInClick} 
          className={adminButtonStyle}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span dangerouslySetInnerHTML={{ __html: animatedTitleAdmin }} />
          {isLoading && <AnimatedLoadingDots />}
        </button>
      </div>
                  
    </div>
  )
}