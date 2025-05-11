// contexts/GiftContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

export interface GiftContextType {
  hasNewGift: boolean;
  setHasNewGift: React.Dispatch<React.SetStateAction<boolean>>;
  showGiftModal: boolean;
  setShowGiftModal: React.Dispatch<React.SetStateAction<boolean>>;
  popularSaying: { portuguese: string; french: string } | null;
  setPopularSaying: React.Dispatch<React.SetStateAction<{ portuguese: string; french: string } | null>>;
  grantGift: () => void;
}

export const GiftContext = createContext<GiftContextType | undefined>(undefined);

export const GiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasNewGift, setHasNewGift] = useState<boolean>(false); // Inicializa como false no servidor
  const [showGiftModal, setShowGiftModal] = useState<boolean>(false);
  const [popularSaying, setPopularSaying] = useState<{ portuguese: string; french: string } | null>(null);

  useEffect(() => {
    // Executa apenas no cliente após a montagem
    const giftData = localStorage.getItem('gift');
    if (giftData) {
      const { expiry, hasGift } = JSON.parse(giftData);
      if (new Date().getTime() < expiry) {
        setHasNewGift(hasGift);
      } else {
        localStorage.removeItem('gift');
        setHasNewGift(false);
      }
    }
  }, []); // Dependência vazia: roda apenas uma vez no cliente

  useEffect(() => {
    // Executa no cliente sempre que hasNewGift mudar
    const expiry = new Date().getTime() + (24 * 60 * 60 * 1000); // 1 dia
    localStorage.setItem('gift', JSON.stringify({ expiry, hasGift: hasNewGift }));
  }, [hasNewGift]);

  const grantGift = () => {
    // Atualiza o estado usando a forma funcional para garantir que pegue o valor mais recente
    setHasNewGift((prevHasNewGift) => !prevHasNewGift);
    // Força uma re-renderização imediata (pode não ser estritamente necessário, mas para teste)
    setTimeout(() => {
      setHasNewGift((prevHasNewGift) => !prevHasNewGift);
    }, 0);
  };

  return (
    <GiftContext.Provider value={{ hasNewGift, setHasNewGift, showGiftModal, setShowGiftModal, popularSaying, setPopularSaying, grantGift }}>
      {children}
    </GiftContext.Provider>
  );
};

export const useGift = () => {
  const context = useContext(GiftContext);
  if (!context) {
    throw new Error('useGift deve ser usado dentro de um GiftProvider');
  }
  return context;
};