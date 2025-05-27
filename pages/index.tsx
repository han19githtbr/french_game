import { signIn, useSession, getProviders } from 'next-auth/react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ShieldCheck } from 'lucide-react';



const ADMIN_EMAIL = 'milliance23@gmail.com';
const DAILY_ACCESS_KEY = 'frenchLearningDailyAccess';
const LAST_RESET_KEY = 'frenchLearningLastReset';


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
  const titleGoogle = "Entrar com conta Google";
  const titleAdmin = 'Entrar como administrador';
  const [animatedTitle, setAnimatedTitle] = useState("");
  const [animatedTitleGoogle, setAnimatedTitleGoogle] = useState("");
  const [animatedTitleAdmin, setAnimatedTitleAdmin] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dailyAccessCount, setDailyAccessCount] = useState(0);
  const [dayName, setDayName] = useState('');
  const [proverb, setProverb] = useState<Proverb | null>(null);
  //const [providers, setProviders] = useState<Record<string, any> | null>(null);


  useEffect(() => {
    const fetchDailyAccessCount = async () => {
      try {
        const response = await fetch('/api/getAccessCount'); // Crie esta rota no próximo passo
        if (response.ok) {
          const data = await response.json();
          setDailyAccessCount(data.count || 0);
        } else {
          console.error('Erro ao buscar a contagem de acessos');
        }
      } catch (error) {
        console.error('Erro ao buscar a contagem de acessos:', error);
      }
    };

    const updateDayName = () => {
      setDayName(getDayName(new Date()));
    };

    fetchDailyAccessCount();
    updateDayName();
    const intervalId = setInterval(updateDayName, 60 * 60 * 1000); // Atualiza o nome do dia a cada hora

    return () => clearInterval(intervalId);
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
          `<span style="color: blue; text-shadow: 0 0 14px blue;">${titleGoogle[i]}</span>` :
          `<span style="color: lightblue;">${titleGoogle[i]}</span>`;
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
    

  /*const handleSignInClick = () => {
    const newCount = dailyAccessCount + 1;
    setDailyAccessCount(newCount);
    localStorage.setItem(DAILY_ACCESS_KEY, newCount.toString());
    signIn('google');
  };*/


  const handleSignInClick = async () => {
    // Envia uma requisição POST para a API para incrementar a contagem
    try {
      await fetch('/api/incrementAccess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      signIn('google');
    } catch (error) {
      console.error('Erro ao incrementar o acesso:', error);
      // Lide com o erro conforme necessário
      signIn('google'); // Ainda tenta o login mesmo se falhar o incremento
    }
  };


  const handleAdminLogin = async () => {
    try {
      await fetch('/api/incrementAccess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      signIn('google', { callbackUrl: '/admin' });
    } catch (error) {
      console.error('Erro ao incrementar o acesso:', error);
      signIn('google', { callbackUrl: '/admin' });
    }
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
            
      <div className="absolute top-60 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-10 rounded-md shadow-md p-4 sm:p-6 flex flex-col items-center justify-center w-auto sm:w-auto"> {/* Ajustes de padding e largura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-white font-semibold italic mb-2 whitespace-nowrap" // Adicionando whitespace-nowrap
        >
          Frequência de Login
        </motion.div>
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-green mr-2 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354l-2 2m0 0l-2-2m2 2v14.7m-2-2l-2-2m2 2l2 2m7-2l-2-2m0 0l-2 2m2-2v14.7m-2-2l-2-2m2 2l2 2"
            />
          </svg>
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="font-semibold text-2xl text-green animate-pulse"
          >
            {dailyAccessCount}
          </motion.span>
        </div>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="text-sm mt-1 text-gray-300 whitespace-nowrap" // Adicionando whitespace-nowrap
        >
          Acessos de: <span className="font-medium text-green">{dayName}</span>
        </motion.span>
      </div>
      
      <h1
        className="text-2xl font-semibold mt-94 mb-8 text-center"
        dangerouslySetInnerHTML={{ __html: animatedTitle }}
      />
            
      <button
        onClick={handleSignInClick}
        className="flex sm:mb-20 items-center gap-3 bg-transparent hover:border-green border border-blue text-gray-100 font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-xl transition duration-300 cursor-pointer"
      >
        <svg className="w-12 h-6" viewBox="0 0 533.5 544.3">
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


      <button
        onClick={handleAdminLogin}
        className="mt-6 mb-10 xl:-mt-10 flex items-center justify-center gap-2 bg-transparent border border-e-yellow hover:border-green text-white font-bold py-3 px-7 rounded-lg shadow transition-all duration-300 cursor-pointer"
      >
        <ShieldCheck className="w-5 h-5" />
        <span>Entrar como Administrador</span>
      </button>
                  
    </div>
  )
}