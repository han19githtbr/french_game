import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

interface Proverb {
  french: string;
  portuguese: string;
}

const frenchProverbs: Proverb[] = [
  { french: 'Petit à petit, l\'oiseau fait son nid.', portuguese: 'Pouco a pouco, as coisas vão dando certo.' },
  { french: 'Il ne faut pas mettre la charrue avant les bœufs.', portuguese: 'Não coloque a carroça na frente dos bois.' },
  { french: 'Tous les chemins mènent à Rome.', portuguese: 'Existem maneiras diferentes de alcançar um mesmo objetivo.' },
  { french: 'Mieux vaut tard que jamais.', portuguese: 'Melhor tarde do que nunca.' },
  { french: 'Qui vivra verra.', portuguese: 'Quem viver verá.' },
  { french: 'L\'habit ne fait pas le moine.', portuguese: 'Não julgue pelas aparências.' },
  { french: 'Pierre qui roule n\'amasse pas mousse.', portuguese: 'Pedra que rola não cria musgo.' },
  { french: 'Il faut battre le fer tant qu\'il est chaud.', portuguese: 'Tem que aproveitar a oportunidade enquanto é possível.' },
  { french: 'Rien ne sert de courir, il faut partir à point.', portuguese: 'Não adianta correr, é preciso sair na hora certa.' },
  { french: 'On ne change pas une équipe qui gagne.', portuguese: 'Não tente modificar o que está dando certo.' },
  { french: 'À bon entendeur, salut!', portuguese: 'A bom entendedor, meia palavra basta!' },
  { french: 'Telle mère, telle fille', portuguese: 'Se trata de uma filha que herdou traços de personalidade da mãe.' },
  { french: 'Tel père, tel fils', portuguese: 'Se trata de um filho que herdou traços de personalidade do pai.' },
  { french: 'À bon vin point d\'enseigne', portuguese: 'O que é valioso não precisa ser recomendado.' },
];

const getDayName = (date: Date) => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

const renderHighlightedTitle = (text: string, activeIndex: number) =>
  text.split('').map((char, index) => (
    <span
      key={`${char}-${index}`}
      className={cn(
        'transition-all duration-100',
        index === activeIndex
          ? 'text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.7)]'
          : 'text-slate-200/90',
      )}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const title = 'Aprenda Francês jogando';
  const titleGoogle = 'Entrar com conta Google';
  const titleAdmin = 'Entrar como administrador';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dailyAccessCount, setDailyAccessCount] = useState(0);
  const [dayName, setDayName] = useState('');
  const [proverb, setProverb] = useState<Proverb | null>(null);

  useEffect(() => {
    const fetchDailyAccessCount = async () => {
      try {
        const response = await fetch('/api/getAccessCount');
        if (response.ok) {
          const data = await response.json();
          setDailyAccessCount(data.count || 0);
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
    const intervalId = setInterval(updateDayName, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (session) {
      router.replace('/game');
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % title.length);
    }, 100);

    const proverbIntervalId = setInterval(() => {
      const randomProverbIndex = Math.floor(Math.random() * frenchProverbs.length);
      setProverb(frenchProverbs[randomProverbIndex]);
    }, 10000);

    const initialProverbIndex = Math.floor(Math.random() * frenchProverbs.length);
    setProverb(frenchProverbs[initialProverbIndex]);

    return () => {
      clearInterval(intervalId);
      clearInterval(proverbIntervalId);
    };
  }, [session, status, router, title.length]);

  const handleSignInClick = async () => {
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
      signIn('google');
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

  if (status === 'loading' || session) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#111827_45%,_#0f172a_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_30%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-5xl rounded-[28px] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl sm:p-8 lg:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Uma experiência de francês mais divertida e envolvente
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                  {renderHighlightedTitle(title, currentIndex)}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Pratique vocabulário, frases e provérbios com uma interface moderna, sons, vídeos e desafios diários em um só lugar.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Hoje</p>
                    <p className="text-xl font-semibold text-white">{dayName || 'Carregando...'}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-right">
                    <p className="text-sm text-emerald-200">Acessos</p>
                    <div className="flex items-center gap-2 text-2xl font-semibold text-emerald-300">
                      <TrendingUp className="h-5 w-5" />
                      {dailyAccessCount}
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Provérbio do momento</p>
                <p className="text-lg font-medium italic text-cyan-100">
                  {proverb ? `“${proverb.french}”` : 'Carregando provérbio...'}
                </p>
                {proverb && <p className="mt-2 text-sm text-slate-300">{proverb.portuguese}</p>}
              </motion.div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleSignInClick}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-4 text-left font-semibold text-cyan-100 shadow-lg shadow-cyan-950/20 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-400/20"
              >
                <svg className="h-6 w-10 shrink-0" viewBox="0 0 533.5 544.3" aria-hidden="true">
                  <path d="M533.5 278.4c0-17.4-1.5-34.1-4.4-50.4H272v95.3h147.1c-6.4 34.7-25.4 64-54 83.6v69h87.2c51-47 81.2-116.2 81.2-197.5z" fill="#4285f4" />
                  <path d="M272 544.3c73.4 0 135-24.3 180-66.2l-87.2-69c-24.2 16.3-55.3 26-92.8 26-71 0-131.2-47.9-152.8-112.4H31.6v70.7C75.6 482.6 167.4 544.3 272 544.3z" fill="#34a853" />
                  <path d="M119.2 322.7c-10.4-30.7-10.4-63.7 0-94.4v-70.7H31.6c-35.5 70.8-35.5 154.7 0 225.5l87.6-70.4z" fill="#fbbc04" />
                  <path d="M272 107.7c39.9-.6 78 13.8 107.5 39.4l80.3-80.3C407.2 24.3 345.6 0 272 0 167.4 0 75.6 61.7 31.6 162.3l87.6 70.7C140.8 155.6 201 107.7 272 107.7z" fill="#ea4335" />
                </svg>
                <span className="text-lg">{renderHighlightedTitle(titleGoogle, currentIndex)}</span>
              </button>

              <button
                onClick={handleAdminLogin}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-4 font-semibold text-amber-100 transition duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-400/20"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>Entrar como Administrador</span>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-200">Restrito</span>
              </button>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
                <p className="font-semibold text-white">O que você encontra aqui</p>
                <ul className="mt-2 space-y-2">
                  <li>• Exercícios por tema e dificuldade.</li>
                  <li>• Frases e ditados em francês com contexto.</li>
                  <li>• Vídeos curtos e sons para reforçar o aprendizado.</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
