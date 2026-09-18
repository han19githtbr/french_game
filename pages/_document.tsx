import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt">
      <Head>
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Ícone para a aba do navegador */}
        <link rel="icon" href="/icons/icon-192x192.png" />
        
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Cor da barra de endereço no mobile */}
        <meta name="theme-color" content="#080b11" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Applies the saved theme before React hydrates, so there's no flash of the wrong appearance. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('french-quest-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='dark'){document.documentElement.classList.add('dark');}document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
