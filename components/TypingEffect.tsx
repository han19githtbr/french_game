import { useState, useEffect } from 'react';

interface TypingEffectProps {
  text: string;
  speed?: number;
  className?: string;
}

export default function TypingEffect({ text, speed = 80, className = '' }: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);


  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);

    // Fala automática ao iniciar
    if (typeof window !== 'undefined' && text) {
      // Detecta idioma simples: se tem muitos acentos e palavras/frases comuns do português, pt-BR; se for francês, fr-FR
      const ptWords = [' que ', ' de ', ' para ', ' com ', 'não', 'uma', 'por', 'seu', 'sua', 'você', 'eu', 'meu', 'minha', 'nosso', 'nossa', 'está', 'ser', 'foi', 'tem', 'em ', 'é ', 'os ', 'as ', 'um ', 'uma ', 'ao ', 'à ', 'às ', 'dos ', 'das ', 'no ', 'na ', 'nas ', 'nos '];
      const frWords = [' le ', ' la ', ' les ', ' des ', ' une ', ' un ', ' du ', ' de ', ' en ', ' est ', ' et ', ' pour ', 'avec', 'vous', 'nous', 'ils', 'elle', 'il ', 'je ', 'tu ', 'mon ', 'ma ', 'mes ', 'ton ', 'ta ', 'tes ', 'son ', 'sa ', 'ses ', 'leur ', 'leurs ', 'être', 'avoir', 'été', 'fait', 'sur', 'dans', 'par', 'au ', 'aux ', 'ce ', 'cette ', 'ces ', 'qui ', 'que ', 'quoi ', 'où ', 'comment ', 'quand ', 'pourquoi '];
      const lower = text.toLowerCase();
      // Conta palavras e acentos típicos do português
      let ptScore = ptWords.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0); // linha 36: soma 1 para cada palavra comum do português encontrada
      ptScore += (lower.match(/[ãõáéíóúâêôç]/g) || []).length; // linha 37: soma 1 para cada acento típico do português
      // Conta palavras e acentos típicos do francês
      let frScore = frWords.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0); // linha 38: soma 1 para cada palavra comum do francês encontrada
      frScore += (lower.match(/[àâçéèêëîïôûùüÿœæ]/g) || []).length; // linha 39: soma 1 para cada acento típico do francês
      let lang = 'fr-FR';
      if (ptScore > frScore && ptScore > 1) lang = 'pt-BR';
      // Cancela qualquer fala anterior
      window.speechSynthesis.cancel(); // linha 44: interrompe qualquer voz que esteja falando antes de iniciar a nova
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }
  }, [text]);

  return <span className={className}>{displayedText}</span>;
}