import { Html, Head, Main, NextScript } from 'next/document';
import Document, { DocumentContext, DocumentInitialProps } from 'next/document';

interface Props extends DocumentInitialProps {}

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps;
  }

  render() {
    return (
      <Html lang="pt">
        <Head>
          {/* Manifest */}
          <link rel="manifest" href="/manifest.json" />

          {/* Ícone para a aba do navegador */}
          <link rel="icon" href="/icons/icon-192x192.png" />

          {/* Apple Touch Icon */}
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" sizes="192x192" />

          {/* Cor da barra de endereço no mobile */}
          <meta name="theme-color" content="#000000" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="mobile-web-app-capable" content="yes" />

          {/* Estilo para arredondar o ícone (tentativa, pode não funcionar em PWA) */}
          <style jsx global>
            {`
              link[rel="icon"],
              link[rel="apple-touch-icon"] {
                border-radius: 10px; /* Tente arredondar os ícones */
              }
            `}
          </style>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;