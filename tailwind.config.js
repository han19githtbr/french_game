/** @type {import('tailwindcss').Config} */
export const content = [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
];
export const theme = {
    extend: {
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },  
      
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%, 45%, 75%': { transform: 'scale(1.1)' }, // Pulsos mais definidos
        },
        // Mantenha suas outras keyframes aqui se tiver (typing, blink-caret, etc.)
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        'blink-caret': {
          'from, to': { 'border-right-color': 'transparent' },
          '50%': { 'border-right-color': 'gold' },
        },
        'blink-caret-red': {
          'from, to': { 'border-right-color': 'transparent' },
          '50%': { 'border-right-color': '#FF4500' },
        },
        modalScaleIn: {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        fadeInOut: {
          '0%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.8)' },
          '10%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          '90%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.8)' },
        },
        fadeInOutLastAttempt: {
          '0%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.8)' },
          '10%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          '90%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.8)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 1.5s ease-in-out infinite', // Duração e timing function para a animação
        typing: 'typing 5s steps(30, end) forwards',
        'blink-caret': 'blink-caret .75s step-end infinite',
        'typing-last-attempt': 'typing 5s steps(45, end) forwards, blink-caret-red .75s step-end infinite', // Combine as animações de digitação e piscar do cursor aqui
        'modal-scale-in': 'modalScaleIn 0.3s ease-out forwards',
        'fade-in-out': 'fadeInOut 5.5s ease-in-out forwards',
        'fade-in-out-last-attempt': 'fadeInOutLastAttempt 5.5s ease-in-out forwards',
      },
    },
    
    
};
export const plugins = [
    require('tailwindcss-scrollbar')({ preferredStrategy: 'class' }),
    require('tailwindcss-animate'),
];
  