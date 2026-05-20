// pages/admin.tsx
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChevronDown, LogOut } from 'lucide-react';
import PostForm from '../components/Post/PostForm';
import PostList from '../components/Post/PostList';
import NotificationBadge from '../components/NotificationBadge';
import { useSocket } from '../lib/socket';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'milliance23@gmail.com';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [notificationCount, setNotificationCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();
  const [unlockSection, setUnlockSection] = useState<'frases' | 'ditados' | ''>('');
  const [unlockDays, setUnlockDays] = useState(1);
  const [unlockStatus, setUnlockStatus] = useState('');
  const [currentUnlocks, setCurrentUnlocks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === 'loading') return;
    const isAdmin = session?.user?.email === ADMIN_EMAIL;
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


  useEffect(() => {
    fetch('/api/admin-unlock-status')
      .then(r => r.json())
      .then(data => { if (data.unlocks) setCurrentUnlocks(data.unlocks); })
      .catch(() => {});
  }, []);


  if (status === 'loading' || session?.user?.email !== ADMIN_EMAIL) {
    return <p className="text-white text-center mt-10">Verificando permissões...</p>;
  }

  const handlePostCreated = () => {
    //setActiveTab('view');
    if (socket) {
      socket.emit('newPost');
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white">
 
      {/* Top bar */}
      <div className="w-full flex justify-between items-center px-6 py-8 bg-gray-800 shadow-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'create' ? 'border border-e-lightblue cursor-pointer' : 'border border-e-lightblue cursor-pointer hover:bg-gray-600'}`}
          >
            Criar Publicação
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'view' ? 'border border-e-green cursor-pointer' : 'border border-e-green hover:bg-gray-600 cursor-pointer'}`}
          >
            Ver Publicações
          </button>
          <button
            onClick={() => setActiveTab('unlock')}
            className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'unlock' ? 'border border-yellow-500 cursor-pointer' : 'border border-yellow-500/50 cursor-pointer hover:bg-gray-600'}`}
          >
            🔓 Desbloquear Seções
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
            <div className="absolute right-0 mt-34 w-44 bg-transparent border border-e-lightblue text-white rounded-xl shadow-lg z-50 animate-fade-in-up">
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
 
        {activeTab === 'create' && (
          <PostForm onPostCreated={handlePostCreated} />
        )}
 
        {activeTab === 'view' && (
          <PostList />
        )}
 
        {activeTab === 'unlock' && (
          <div className="max-w-lg mx-auto bg-gray-800 rounded-2xl p-6 border border-yellow-600/40 shadow-xl">
            <h2 className="text-xl font-bold text-yellow-300 mb-4">🔓 Desbloqueio Administrativo</h2>
            <p className="text-sm text-gray-400 mb-6">
              Selecione uma seção e defina por quantos dias ela ficará desbloqueada para todos os usuários.
              O desbloqueio é salvo via API e resolvido no client do usuário.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Seção a desbloquear</label>
                <select
                  value={unlockSection}
                  onChange={e => setUnlockSection(e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Selecione...</option>
                  <option value="frases">Frases em Francês</option>
                  <option value="ditados">Ditados em Francês</option>
                  <option value="curiosidades">Curiosidades!</option>
                </select>
              </div>

              {/* Indicador de status atual da seção selecionada */}
              {unlockSection && (
                <div className={`text-sm px-3 py-2 rounded-lg border ${
                  currentUnlocks[unlockSection]
                    ? 'bg-green-900/40 text-green-300 border-green-700'
                    : 'bg-gray-700/40 text-gray-400 border-gray-600'
                }`}>
                  Status atual: {currentUnlocks[unlockSection] ? '🔓 Desbloqueada' : '🔒 Bloqueada'}
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300 mb-1 block">Duração (dias)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={unlockDays}
                  onChange={e => setUnlockDays(Number(e.target.value))}
                  disabled={!!(unlockSection && currentUnlocks[unlockSection])}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 disabled:opacity-40"
                />
              </div>

              {/* Botão de ação: desbloquear OU re-bloquear conforme o estado */}
              {unlockSection && currentUnlocks[unlockSection] ? (
                <button
                  onClick={async () => {
                    const res = await fetch('/api/admin-unlock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ section: unlockSection, action: 'lock' }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setCurrentUnlocks(prev => ({ ...prev, [unlockSection]: false }));
                      setUnlockStatus(`🔒 "${unlockSection}" bloqueada novamente.`);
                    } else {
                      setUnlockStatus('❌ Erro ao bloquear.');
                    }
                  }}
                  className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition cursor-pointer"
                >
                  🔒 Bloquear novamente
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (!unlockSection) return;
                    const expiryMs = Date.now() + unlockDays * 24 * 60 * 60 * 1000;
                    const res = await fetch('/api/admin-unlock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ section: unlockSection, expiryMs, action: 'unlock' }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setCurrentUnlocks(prev => ({ ...prev, [unlockSection]: true }));
                      setUnlockStatus(`✅ "${unlockSection}" desbloqueada por ${unlockDays} dia(s).`);
                    } else {
                      setUnlockStatus('❌ Erro ao desbloquear.');
                    }
                  }}
                  disabled={!unlockSection}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔓 Desbloquear agora
                </button>
              )}

              {unlockStatus && (
                <p className="text-sm text-center mt-2 text-green-300">{unlockStatus}</p>
              )}
            </div>
          </div>
        )}
 
      </div>
    </div>
  );
}
