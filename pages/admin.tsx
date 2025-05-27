// pages/admin.tsx
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChevronDown, LogOut } from 'lucide-react';


export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (status === 'loading') return;
    const isAdmin = session?.user?.email === 'milliance23@gmail.com';
    if (!isAdmin) router.push('/');
  }, [session, status, router]);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  if (status === 'loading' || session?.user?.email !== 'milliance23@gmail.com') {
    return <p className="text-white text-center mt-10">Verificando permissões...</p>;
  }

  return (
    <div className="relative min-h-screen bg-gray-900 text-white">
      {/* Top bar */}
      <div className="w-full flex justify-end items-center px-6 py-4 bg-gray-800 shadow-md">
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <p className="text-sm font-medium hidden sm:block">{session.user?.name}</p>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="rounded-full overflow-hidden w-10 h-10 ring-2 ring-white focus:outline-none hover:ring-blue-400 transition-all"
          >
            <img
              src={session.user?.image ?? '/default-avatar.png'}
              alt="Foto de perfil"
              className="object-cover w-full h-full cursor-pointer"
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-34 w-44 bg-transparent border border-e-lightblue text-white rounded-xl shadow-lg z-50 animate-fade-in-up ">
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center w-full px-4 py-2 text-sm hover:border border-green rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center h-[calc(100vh-72px)]">
        <h1 className="text-3xl font-bold">Painel do Administrador</h1>
      </div>
    </div>
  );
}
