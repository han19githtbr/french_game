// pages/admin.tsx
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChevronDown, LogOut } from 'lucide-react';
import PostForm from '../components/Post/PostForm';
import PostList from '../components/Post/PostList';
import NotificationBadge from '../components/NotificationBadge';
import { useSocket } from '../lib/socket';


export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [notificationCount, setNotificationCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();


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


  useEffect(() => {
    if (!socket) return;

    socket.on('newPostNotification', () => {
      setNotificationCount(prev => prev + 1);
    });

    return () => {
      socket.off('newPostNotification');
    };
  }, [socket]);


  if (status === 'loading' || session?.user?.email !== 'milliance23@gmail.com') {
    return <p className="text-white text-center mt-10">Verificando permissões...</p>;
  }

  const handlePostCreated = () => {
    setActiveTab('view');
    if (socket) {
      socket.emit('newPost');
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white">
      {/* Top bar */}
      <div className="w-full flex justify-between items-center px-6 py-8 bg-gray-800 shadow-md">
        <div className="flex items-center space-x-2 ">
          <button 
            onClick={() => setActiveTab('create')} 
            className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'create' ? 'border border-e-lightblue cursor-pointer' : 'border border-e-lightblue cursor-pointer hover:bg-gray-600'}`}
          >
            Criar Publicação
          </button>
          <button 
            onClick={() => setActiveTab('view')} 
            className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'view' ? 'border border-e-green cursor-pointer ' : 'border border-e-green hover:bg-gray-600 cursor-pointer'}`}
          >
            Ver Publicações
          </button>
        </div>
        
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <NotificationBadge count={notificationCount} />
          <p className="text-sm font-sm hidden sm:block">{session.user?.name}</p>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="rounded-full overflow-hidden w-8 h-8 ring-2 ring-white focus:outline-none hover:ring-blue-400 transition-all -mr-2"
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
      <div className="container mx-auto px-4 py-8 mt-20">
        {activeTab === 'create' ? (
          <PostForm onPostCreated={handlePostCreated} />
        ) : (
          <PostList />
        )}
      </div>
    </div>
  );
}
