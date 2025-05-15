import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import ChatManager from '../components/ChatManager';
import AdminNoticeForm from '../components/AdminNoticeForm';


export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Carregando...</div>;
  }

  if (session) {
    const toggleDropdown = () => {
      setDropdownOpen(!dropdownOpen);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
        
        {/* ChatManager fixado no canto inferior direito */}
        {session?.user?.name && session?.user?.email && (
          <ChatManager
            currentUser={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image || '',
            }}
          />
        )}

        {/* Container para nome e foto no canto superior direito */}
        <div className="absolute top-5 left-4 flex items-center z-10">
          
          <button
            onClick={toggleDropdown}
            className="relative w-10 h-10 rounded-full overflow-hidden shadow-md transition duration-300 hover:scale-105 cursor-pointer"
          >
            {session?.user?.image ? (
              <Image src={session.user.image} alt={session.user.name ?? 'Admin'} layout="fill" objectFit="cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full border-2 border-lightblue bg-transparent hover:bg-blue text-gray-200 text-sm">
                {/* Adicione uma imagem padrão ou inicial aqui se desejar */}
                <span>{session?.user?.name?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
            )}
          </button>

          <div className="text-right ml-2">
            <span className="block text-gray-200 font-semibold text-sm md:text-base">
              {session?.user?.name || 'Administrador'}
            </span>
          </div>

          {/* Dropdown de Logout */}
          {dropdownOpen && (
            <div className="absolute top-12 right-0 bg-white shadow-lg rounded-md overflow-hidden w-26 z-50">
              <button
                onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
                className="block w-full text-left px-6 py-1 text-gray-200 text-sm hover:bg-lightblue border border-blue bg-gray-700 focus:outline-none transition duration-150 ease-in-out cursor-pointer"
              >
                Sair
              </button>
            </div>
          )}
        </div>

        <h1 className="absolute text-2xl font-thin text-gray-300 mb-6 mt-35 text-left z-30">
          Bem-vindo: <span className='text-green'>{session?.user?.name}</span>
        </h1>

              
        <AdminNoticeForm />
      
      </div>
    );
  }

  return <div>Redirecionando...</div>;
}