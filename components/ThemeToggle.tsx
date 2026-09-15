import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme-context';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-200
        border-(--color-border) bg-(--color-surface) text-(--color-text)
        hover:border-(--color-accent) hover:text-(--color-accent) ${className}`}
    >
      {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
