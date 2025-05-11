// components/GiftModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useGift } from '../contexts/GiftContext';

const popularSayings = [
  { french: "Petit à petit, l'oiseau fait son nid.", portuguese: "De grão em grão, a galinha enche o papo." },
  { french: "Il ne faut pas mettre la charrue avant les bœufs.", portuguese: "Não coloque a carroça na frente dos bois." },
  { french: "Tous les chemins mènent à Rome.", portuguese: "Existem maneiras diferentes de alcançar um mesmo objetivo." },
  { french: "Mieux vaut tard que jamais.", portuguese: "Melhor tarde do que nunca." },
  { french: "Qui vivra verra.", portuguese: "Quem viver verá." },
  { french: "L'habit ne fait pas le moine.", portuguese: "Não julgue pelas aparências." },
  { french: "Pierre qui roule n'amasse pas mousse.", portuguese: "Pedra que rola não cria musgo." },
  { french: "Il faut battre le fer tant qu'il est chaud.", portuguese: "Tem que aproveitar a oportunidade enquanto é possível." },
  { french: "Rien ne sert de courir, il faut partir à point.", portuguese: "Não adianta correr, é preciso sair na hora certa." },
  { french: "On ne change pas une équipe qui gagne.", portuguese: "Não tente modificar o que está dando certo." },
  { french: "À bon entendeur, salut!", portuguese: "A bom entendedor, meia palavra basta!" },
  { french: "Telle mère, telle fille", portuguese: "Se trata de uma filha que herdou traços de personalidade da mãe" },
  { french: "Tel père, tel fils", portuguese: "Se trata de um filho que herdou traços de personalidade do pai" },
  { french: "À bon vin point d'enseigne", portuguese: "O que é valioso não precisa ser recomendado" },
  { french: "Petit à petit, on finit par obtenir des résultats.", portuguese: "Água mole em pedra dura, tanto bate até que fura." },
  { french: "Le chien aboie, la caravane passe.", portuguese: "Seguir o seu caminho sem se preocupar com opiniões alheias" },
  { french: "Le chien qui aboie ne mord pas.", portuguese: "Cão que ladra não morde." },
];


const LoadingScreen = () => (
  <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white p-8 rounded-md shadow-lg text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mx-auto mb-4"></div>
      <p className="text-lg font-semibold text-gray-700">Preparando seu presente...</p>
    </div>
  </div>
);

const GiftModal = () => {
  const { showGiftModal, setShowGiftModal, popularSaying, setPopularSaying } = useGift(); // Obtemos popularSaying do contexto
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenGift = useCallback(() => {
    setIsLoading(true);
    // Simula um carregamento
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * popularSayings.length);
      setPopularSaying(popularSayings[randomIndex]);
      setIsLoading(false);
    }, 1500);
  }, [setPopularSaying]);

  // Efeito para buscar um novo ditado cada vez que o modal é aberto
  useEffect(() => {
    if (showGiftModal) {
      handleOpenGift();
    }
  }, [showGiftModal, handleOpenGift]);

  return (
    <>
      {isLoading && <LoadingScreen />}
      {showGiftModal && popularSaying && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Seu Presente!</h2>
            <p className="mb-2 text-gray-700">
              <strong className="text-blue-500">Ditado Popular (PT):</strong> {popularSaying.portuguese}
            </p>
            <p className="text-gray-700">
              <strong className="text-indigo-500">Définition (FR):</strong> {popularSaying.french}
            </p>
            <button onClick={() => setShowGiftModal(false)} className="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GiftModal;