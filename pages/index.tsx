import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
//import { cn } from "@/lib/utils";
import { cn } from '../lib/utils';

const DAILY_ACCESS_KEY = 'frenchLearningDailyAccess';
const LAST_RESET_KEY = 'frenchLearningLastReset';
const PROVERBS_KEY = 'frenchLearningProverbs';
const LAST_PROVERB_DATE_KEY = 'frenchLearningLastProverbDate';


interface Proverb {
  french: string;
  portuguese: string;
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

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()
  const title = "Aprenda Francês jogando";
  const titleGoogle = "Entrar com Google";
  const [animatedTitle, setAnimatedTitle] = useState("");
  const [animatedTitleGoogle, setAnimatedTitleGoogle] = useState("");
  const [animatedTitleAccess, setAnimatedTitleAccess] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dailyAccessCount, setDailyAccessCount] = useState(0);
  const [dayName, setDayName] = useState('');
  const [proverb, setProverb] = useState<Proverb | null>(null);


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
          
    } else {
      setAnimatedTitle(title); // Se estiver logado, mostra o título normal
      setAnimatedTitleGoogle(titleGoogle);
    }
    
  }, [currentIndex, session, title, titleGoogle]);


  const handleSignInClick = () => {
    const newCount = dailyAccessCount + 1;
    setDailyAccessCount(newCount);
    localStorage.setItem(DAILY_ACCESS_KEY, newCount.toString());
    signIn('google');
  };


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
          className={cn(
            "bg-white bg-opacity-10 rounded-xl shadow-lg p-4 mb-6",
            "backdrop-blur-md "
          )}
        >
          <h2 className={cn(
            "text-lg font-semibold mb-2",
            "text-gray-300",
            "sm:text-xl md:text-2xl",
            "tracking-wide"
          )}>
            Ditados usados no dia a dia!
          </h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="space-y-2"
          >
            <p className={cn(
              "text-md italic",
              "text-white",
              "sm:text-lg md:text-xl",
              "leading-relaxed",
              "font-serif"
            )}>
              {proverb ? `"${proverb.french}"` : "Carregando provérbio..."}
            </p>
            {proverb && (
              <p className={cn(
                "text-sm italic",
                "text-gray-300",
                "sm:text-base md:text-lg",
                "text-center",

              )}>
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
      
        {/* AdSense ad slot */}
        {/*<div className="mb-4">
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client="YOUR_AD_CLIENT_ID" // Substitua pelo seu ID do AdSense
            data-ad-slot="YOUR_AD_SLOT_ID"     // Substitua pelo seu ID do slot de anúncio
            data-ad-format="horizontal"      // Adapte o formato do anúncio
          ></ins>
          
          {!document.getElementById('adsense-script') &&
            <script
              id='adsense-script'
              async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
            ></script>
          }
        </div>*/}
      </div>
      
      <div className="absolute top-64 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-10 rounded-md shadow-md p-3 flex flex-col items-center justify-center">
        <span className='text-white font-bold italic'>Frequência de login</span>
        <span className="font-semibold text-sm mb-1 text-gray-300 items-center">Acessos <span className='text-green'>({dayName})</span></span>
        <div className="flex items-center mr-8">
          
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-25 text-green mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.237l.051.02C7.414 2.469 7.5 2.716 7.5 3c0 .833-.333 1.5-1 1.5-.667 0-1.333-.667-1-1.5c0-.284.086-.531.262-.763l.051-.02a2 2 0 012.977-1.412c.414.12.85.346 1.15.671a2 2 0 01.668 1.488l.032.029" />
          </svg>
          <span className="font-semibold text-lg text-green mt-3">{dailyAccessCount}</span>
        </div>
      </div>
      <h1
        className="text-4xl font-bold mt-90 mb-8 text-center"
        dangerouslySetInnerHTML={{ __html: animatedTitle }}
      />
      
      <button
        onClick={handleSignInClick}
        className="flex items-center gap-3 bg-transparent hover:border-green border border-blue text-gray-300 font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-xl transition duration-300 cursor-pointer"
      >
        <svg className="w-6 h-6" viewBox="0 0 533.5 544.3">
          <path
            d="M533.5 278.4c0-17.4-1.5-34.1-4.4-50.4H272v95.3h147.1c-6.4 34.7-25.4 64-54 83.6v69h87.2c51-47 81.2-116.2 81.2-197.5z"
            fill="#4285f4"
          />
          <path
            d="M272 544.3c73.4 0 135-24.3 180-66.2l-87.2-69c-24.2 16.3-55.3 26-92.8 26-71 0-131.2-47.9-152.8-112.4H31.6v70.7C75.6 482.6 167.4 544.3 272 544.3z"
            fill="#34a853"
          />
          <path
            d="M119.2 322.7c-10.4-30.7-10.4-63.7 0-94.4v-70.7H31.6c-35.5 70.8-35.5 154.7 0 225.5l87.6-70.4z"
            fill="#fbbc04"
          />
          <path
            d="M272 107.7c39.9-.6 78 13.8 107.5 39.4l80.3-80.3C407.2 24.3 345.6 0 272 0 167.4 0 75.6 61.7 31.6 162.3l87.6 70.7C140.8 155.6 201 107.7 272 107.7z"
            fill="#ea4335"
          />
        </svg>
        <span
          dangerouslySetInnerHTML={{ __html: animatedTitleGoogle }}
        />
        
      </button>
    </div>
  )
}