import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Sparkles, TrendingUp } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

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
          ? 'text-(--color-accent) drop-shadow-[0_0_18px_var(--color-accent-soft)]'
          : 'text-(--color-text)/90',
      )}
    >
      {char === ' ' ? ' ' : char}
    </span>
  ));

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const title = 'Aprenda Francês jogando';
  const titleGoogle = 'Entrar com conta Google';
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
    <div className="relative min-h-screen overflow-hidden bg-(--color-bg) text-(--color-text) transition-colors duration-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--color-accent-soft),_transparent_40%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-(--color-text-muted)">
            French Quest <span className="text-(--color-accent)">v2.0</span>
          </div>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-5xl rounded-[28px] border border-(--color-border) bg-(--color-surface) p-6 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8 lg:p-10"
        >
          <div className="grid min-w-0 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0 space-y-6">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-(--color-accent)/30 bg-(--color-accent-soft) px-3 py-1 text-sm font-medium text-(--color-accent)">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Uma experiência de francês mais divertida e envolvente</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    role="img"
                    aria-label="Bandeira da França"
                    title="Francês"
                    className="text-2xl leading-none drop-shadow-sm"
                  >
                    🇫🇷
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-text-muted)">
                    Francês
                  </span>
                </div>
                <h1 className="break-words text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                  {renderHighlightedTitle(title, currentIndex)}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-(--color-text-muted) sm:text-lg">
                  Pratique vocabulário, frases e provérbios com uma interface moderna, sons, vídeos e desafios diários em um só lugar.
                </p>
              </div>

              <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-alt) p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--color-text-muted)">Hoje</p>
                    <p className="text-xl font-semibold">{dayName || 'Carregando...'}</p>
                  </div>
                  <div className="rounded-2xl border border-(--color-success)/30 bg-(--color-success-soft) px-4 py-3 text-right">
                    <p className="text-sm text-(--color-success)">Acessos</p>
                    <div className="flex items-center gap-2 text-2xl font-semibold text-(--color-success)">
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
                className="rounded-2xl border border-(--color-border) bg-(--color-bg) p-4"
              >
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-(--color-text-muted)">Provérbio do momento</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={proverb ? proverb.french : 'loading'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-lg font-medium italic text-(--color-accent)">
                      {proverb ? `“${proverb.french}”` : 'Carregando provérbio...'}
                    </p>
                    {proverb && <p className="mt-2 text-sm text-(--color-text-muted)">{proverb.portuguese}</p>}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="min-w-0 space-y-4">
              <button
                onClick={handleSignInClick}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-(--color-accent)/40 bg-(--color-accent-soft) px-5 py-4 text-left font-semibold text-(--color-accent) shadow-lg shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:border-(--color-accent)"
              >
                <svg className="h-6 w-10 shrink-0" viewBox="0 0 533.5 544.3" aria-hidden="true">
                  <path d="M533.5 278.4c0-17.4-1.5-34.1-4.4-50.4H272v95.3h147.1c-6.4 34.7-25.4 64-54 83.6v69h87.2c51-47 81.2-116.2 81.2-197.5z" fill="#4285f4" />
                  <path d="M272 544.3c73.4 0 135-24.3 180-66.2l-87.2-69c-24.2 16.3-55.3 26-92.8 26-71 0-131.2-47.9-152.8-112.4H31.6v70.7C75.6 482.6 167.4 544.3 272 544.3z" fill="#34a853" />
                  <path d="M119.2 322.7c-10.4-30.7-10.4-63.7 0-94.4v-70.7H31.6c-35.5 70.8-35.5 154.7 0 225.5l87.6-70.4z" fill="#fbbc04" />
                  <path d="M272 107.7c39.9-.6 78 13.8 107.5 39.4l80.3-80.3C407.2 24.3 345.6 0 272 0 167.4 0 75.6 61.7 31.6 162.3l87.6 70.7C140.8 155.6 201 107.7 272 107.7z" fill="#ea4335" />
                </svg>
                <span className="whitespace-normal break-words text-lg">{renderHighlightedTitle(titleGoogle, currentIndex)}</span>
              </button>

              <div className="rounded-2xl border border-(--color-border) bg-(--color-bg) p-4 text-sm leading-7 text-(--color-text-muted)">
                <p className="font-semibold text-(--color-text)">O que você encontra aqui</p>
                <ul className="mt-2 space-y-2">
                  <li>• Exercícios por tema e dificuldade.</li>
                  <li>• Frases e ditados em francês com contexto.</li>
                  <li>• Vídeos curtos e sons para reforçar o aprendizado.</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Admin sign-in is intentionally not a prominent CTA on the public marketing
            page — it's a low-visibility link, since advertising a "restricted admin
            login" to every visitor was more of a liability than a feature. The
            middleware and API routes still enforce the ADMIN_EMAIL check either way. */}
        <button
          onClick={handleAdminLogin}
          className="mt-6 text-xs text-(--color-text-muted) underline decoration-dotted underline-offset-4 hover:text-(--color-accent)"
        >
          Acesso administrativo
        </button>
      </div>
    </div>
  );
}
