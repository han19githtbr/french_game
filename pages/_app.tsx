//import '@/styles/globals.css'
import '../styles/globals.css'
import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  
  /*useEffect(() => {
    fetch('/api/socket') // chama o endpoint uma vez para iniciar o Socket.io
  }, [])*/
  
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  )
}