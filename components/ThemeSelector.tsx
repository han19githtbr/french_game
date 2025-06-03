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
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            theme === selectedTheme 
              ? 'bg-blue text-white' 
              : 'border border-e-green text-white hover:bg-gray-900'
          }`}
        >
          {theme}
        </button>
      ))}
    </div>
  );
}