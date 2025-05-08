import React from 'react';

// Defina a interface para as props do componente OpcoesEstilizadas
interface OpcoesEstilizadasProps {
  options: string[]; // Assume que as opções são um array de strings
  index: number;
  results: { [key: number]: { correct_word?: boolean; selected?: string } | undefined }; // Tipo para o seu estado 'results'
  checkAnswer: (index: number, userAnswer: string) => void; // Tipo para a sua função 'checkAnswer'
}

const OpcoesEstilizadas: React.FC<OpcoesEstilizadasProps> = ({ options, index, results, checkAnswer }) => {
  return (
    <div className="flex flex-col space-y-2">
      {options.map((opt: string, i: number) => (
        <button
          key={i}
          value={opt}
          className={`bg-gray-900 text-white font-semibold rounded-md py-3 px-4 hover:bg-neon-blue active:bg-neon-pink transition-colors duration-200 flex items-center justify-between ${
            results[index]?.selected === opt ? 'border-2 border-neon-blue' : ''
          }`}
          onClick={() => checkAnswer(index, opt)}
        >
          <span>{opt}</span>
          <div className="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center">
            {results[index]?.selected === opt && (
              <div className="w-3 h-3 rounded-full bg-neon-blue" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default OpcoesEstilizadas;