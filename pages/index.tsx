import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()

  if (session) {
    router.push('/game')
    return null
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-pink-500 text-white">
      <h1 className="text-4xl font-bold mb-8 text-center">Aprenda Francês com Estilo Ghibli</h1>
      
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-3 bg-transparent text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-xl transition duration-300"
      >
        <svg className="w-6 h-6" viewBox="0 0 533.5 544.3">
          <path
            d="M533.5 278.4c0-17.4-1.5-34.1-4.4-50.4H272v95.3h147.1c-6.4 34.7-25.4 64-54 83.6v69h87.2c51-47 81.2-116.2 81.2-197.5z"
            fill="#4285f4"
          />
          <path
            d="M272 544.3c73.4 0 135-24.3 180-66.2l-87.2-69c-24.2 16.3-55.3 26-92.8 26-71 0-131.2-47.9-152.8-112.4H31.6v70.7C75.6 482.6 167.4 544.3 272 544.3z"
            fill="#34a853"
          />
          <path
            d="M119.2 322.7c-10.4-30.7-10.4-63.7 0-94.4v-70.7H31.6c-35.5 70.8-35.5 154.7 0 225.5l87.6-70.4z"
            fill="#fbbc04"
          />
          <path
            d="M272 107.7c39.9-.6 78 13.8 107.5 39.4l80.3-80.3C407.2 24.3 345.6 0 272 0 167.4 0 75.6 61.7 31.6 162.3l87.6 70.7C140.8 155.6 201 107.7 272 107.7z"
            fill="#ea4335"
          />
        </svg>
        Entrar com Google
      </button>
    </div>
  )
}