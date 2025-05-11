import React from 'react';
//import styles from './LoadingScreen.module.css'; // Crie este arquivo CSS

interface LoadingScreenProps {}

function LoadingScreen({}: LoadingScreenProps) {
  return (
    <div className="loadingContainer">
      <div className="loadingSpinner"></div>
      <p className="loadingText">Carregando...</p>
    </div>
  );
}

export default LoadingScreen;