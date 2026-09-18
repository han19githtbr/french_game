import { useTheme } from '../lib/theme-context';

// Icons are inlined as SVG on purpose: importing `Moon`/`Sun` by name from
// lucide-react failed to type-check on this project's Vercel build
// ("has no exported member 'Moon'/'Sun'") even though both icons exist in the
// installed version — a known TypeScript/barrel-resolution quirk with
// lucide-react in some build setups. Inlining avoids the import entirely.
function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200
        border-(--border-color) bg-(--bg-card) text-(--text-primary)
        hover:border-(--accent-color) hover:text-(--accent-color) hover:shadow-(--shadow-glow) ${className}`}
    >
      {theme === 'dark' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  );
}
