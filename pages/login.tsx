import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import type { NextPage } from 'next';

const LoginPage: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/game');
    }
  }, [session, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      {/*<h1 className="text-3xl font-bold mb-6">Aprenda Francês com Imagens!</h1>*/}
      <button
        className="bg-blue-500 hover:bg-green text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        onClick={() => signIn('google')}
      >
        Entrar com o Google
      </button>
    </div>
  );
};

export default LoginPage;