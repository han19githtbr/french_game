interface ThemeSelectorProps {
  themes: string[];
  selectedTheme: string;
  onSelectTheme: (theme: string) => void;
}

export default function ThemeSelector({ themes, selectedTheme, onSelectTheme }: ThemeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-30">
      {themes.map(theme => (
        <button
          key={theme}
          onClick={() => onSelectTheme(theme === selectedTheme ? '' : theme)}
          className={`nav-btn ${theme === selectedTheme ? 'active' : ''}`}
        >
          {theme}
        </button>
      ))}
    </div>
  );
}
