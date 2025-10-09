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

    // Fala automática ao iniciar, robusto para mobile (aguarda voiceschanged, fallback rápido)
    if (typeof window !== 'undefined' && text) {
      const ptWords = [' que ', ' de ', ' para ', ' com ', 'não', 'uma', 'por', 'seu', 'sua', 'você', 'eu', 'meu', 'minha', 'nosso', 'nossa', 'está', 'ser', 'foi', 'tem', 'em ', 'é ', 'os ', 'as ', 'um ', 'uma ', 'ao ', 'à ', 'às ', 'dos ', 'das ', 'no ', 'na ', 'nas ', 'nos '];
      const frWords = [' le ', ' la ', ' les ', ' des ', ' une ', ' un ', ' du ', ' de ', ' en ', ' est ', ' et ', ' pour ', 'avec', 'vous', 'nous', 'ils', 'elle', 'il ', 'je ', 'tu ', 'mon ', 'ma ', 'mes ', 'ton ', 'ta ', 'tes ', 'son ', 'sa ', 'ses ', 'leur ', 'leurs ', 'être', 'avoir', 'été', 'fait', 'sur', 'dans', 'par', 'au ', 'aux ', 'ce ', 'cette ', 'ces ', 'qui ', 'que ', 'quoi ', 'où ', 'comment ', 'quand ', 'pourquoi '];
      const lower = text.toLowerCase();
      let ptScore = ptWords.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
      ptScore += (lower.match(/[ãõáéíóúâêôç]/g) || []).length;
      let frScore = frWords.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
      frScore += (lower.match(/[àâçéèêëîïôûùüÿœæ]/g) || []).length;
      let lang = 'fr-FR';
      if (ptScore > frScore && ptScore > 1) lang = 'pt-BR';

      const speak = () => {
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(text);
        utter.lang = lang;
        utter.rate = 0.95;
        // Seleciona voz correta se disponível
        const voices = window.speechSynthesis.getVoices();
        const targetVoice = voices.find(v => v.lang === lang);
        if (targetVoice) utter.voice = targetVoice;
        window.speechSynthesis.speak(utter);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        speak();
      } else {
        const trySpeak = () => speak();
        window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', trySpeak);
          speak();
        }, 500);
      }
    }
  }, [text]);

  return <span className={className}>{displayedText}</span>;
}