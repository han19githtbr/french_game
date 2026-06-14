// pages/admin.tsx
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
// @ts-ignore: module has no declaration file
import { ChevronDown, LogOut, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import PostForm from '../components/Post/PostForm';
import PostList from '../components/Post/PostList';
import NotificationBadge from '../components/NotificationBadge';
import { useSocket } from '../lib/socket';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'milliance23@gmail.com';

type UnlockDurationUnit = 'hours' | 'days' | 'weeks';

interface AdminImage {
  _id: string;
  url: string;
  title: string;
  theme: string;
  source?: string;
  validated?: boolean;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [notificationCount, setNotificationCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  // Unlock state
  const [unlockSection, setUnlockSection] = useState<string>('');
  const [unlockDuration, setUnlockDuration] = useState(1);
  const [unlockUnit, setUnlockUnit] = useState<UnlockDurationUnit>('days');
  const [unlockStatus, setUnlockStatus] = useState('');
  const [currentUnlocks, setCurrentUnlocks] = useState<Record<string, boolean>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, number>>({});

  // Image management state
  const [imgCollection, setImgCollection] = useState<'images' | 'frases' | 'proverbs'>('images');
  const [imgTheme, setImgTheme] = useState('');
  const [imgList, setImgList] = useState<AdminImage[]>([]);
  const [imgTotal, setImgTotal] = useState(0);
  const [imgPage, setImgPage] = useState(1);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgActionStatus, setImgActionStatus] = useState('');

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
    return () => { socket.off('newPostNotification'); };
  }, [socket]);

  useEffect(() => {
    fetch('/api/admin-unlock-status')
      .then(r => r.json())
      .then(data => {
        if (data.unlocks) setCurrentUnlocks(data.unlocks);
        if (data.expiryDates) setExpiryDates(data.expiryDates);
      })
      .catch(() => {});
  }, []);

  if (status === 'loading' || session?.user?.email !== ADMIN_EMAIL) {
    return <p className="text-white text-center mt-10">Verificando permissões...</p>;
  }

  const handlePostCreated = () => {
    if (socket) socket.emit('newPost');
  };

  // Calcular ms com base em duração + unidade
  const calcExpiryMs = () => {
    const now = Date.now();
    if (unlockUnit === 'hours') return now + unlockDuration * 60 * 60 * 1000;
    if (unlockUnit === 'weeks') return now + unlockDuration * 7 * 24 * 60 * 60 * 1000;
    return now + unlockDuration * 24 * 60 * 60 * 1000; // days
  };

  const formatExpiry = (ms: number) => {
    return new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const durationLabel = () => {
    if (unlockUnit === 'hours') return `${unlockDuration} hora(s)`;
    if (unlockUnit === 'weeks') return `${unlockDuration} semana(s)`;
    return `${unlockDuration} dia(s)`;
  };

  // Image management
  const loadImages = async (page = 1) => {
    setImgLoading(true);
    setImgActionStatus('');
    const params = new URLSearchParams({ collection: imgCollection, page: String(page), limit: '12' });
    if (imgTheme.trim()) params.set('theme', imgTheme.trim());
    const res = await fetch(`/api/admin-images?${params}`);
    const data = await res.json();
    setImgList(data.items || []);
    setImgTotal(data.total || 0);
    setImgPage(page);
    setImgLoading(false);
  };

  const deleteImage = async (id: string) => {
    if (!confirm('Remover esta imagem permanentemente?')) return;
    const res = await fetch('/api/admin-images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, collection: imgCollection }),
    });
    const data = await res.json();
    if (data.ok) {
      setImgList(prev => prev.filter(img => img._id !== id));
      setImgTotal(prev => prev - 1);
      setImgActionStatus('✅ Imagem removida.');
    } else {
      setImgActionStatus('❌ Erro ao remover.');
    }
  };

  const validateImage = async (id: string, validated: boolean) => {
    const res = await fetch('/api/admin-images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, collection: imgCollection, validated }),
    });
    const data = await res.json();
    if (data.ok) {
      setImgList(prev => prev.map(img => img._id === id ? { ...img, validated } : img));
      setImgActionStatus(validated ? '✅ Imagem marcada como válida.' : '⚠️ Imagem marcada como inválida.');
    }
  };

  const totalPages = Math.ceil(imgTotal / 12);

  const sectionLabels: Record<string, string> = {
    frases: 'Frases em Francês',
    ditados: 'Ditados em Francês',
    curiosidades: 'Curiosidades!',
    jogo: 'Jogo Principal',
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white">
      {/* Top bar */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start px-6 py-8 bg-gray-800 shadow-md gap-2">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1 rounded-lg text-sm border border-e-lightblue cursor-pointer ${activeTab === 'create' ? 'bg-blue-900/40' : 'hover:bg-gray-600'}`}
          >
            Criar Publicação
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-3 py-1 rounded-lg text-sm border border-e-green cursor-pointer ${activeTab === 'view' ? 'bg-green-900/40' : 'hover:bg-gray-600'}`}
          >
            Ver Publicações
          </button>
          <button
            onClick={() => setActiveTab('unlock')}
            className={`px-3 py-1 rounded-lg text-sm border border-yellow-500 cursor-pointer ${activeTab === 'unlock' ? 'bg-yellow-900/30' : 'hover:bg-gray-600'}`}
          >
            🔓 Desbloquear Seções
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-3 py-1 rounded-lg text-sm border border-purple-500 cursor-pointer ${activeTab === 'images' ? 'bg-purple-900/30' : 'hover:bg-gray-600'}`}
          >
            🖼️ Gerenciar Imagens
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
      <div className="container mx-auto px-4 py-8 mt-4">

        {activeTab === 'create' && <PostForm onPostCreated={handlePostCreated} />}
        {activeTab === 'view' && <PostList />}

        {/* === UNLOCK TAB === */}
        {activeTab === 'unlock' && (
          <div className="max-w-lg mx-auto bg-gray-800 rounded-2xl p-6 border border-yellow-600/40 shadow-xl">
            <h2 className="text-xl font-bold text-yellow-300 mb-1">🔓 Desbloqueio Administrativo</h2>
            <p className="text-sm text-gray-400 mb-6">
              Selecione uma seção, defina a duração e clique em desbloquear. O acesso expira automaticamente após o prazo.
            </p>

            <div className="space-y-4">
              {/* Seção */}
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Seção a desbloquear</label>
                <select
                  value={unlockSection}
                  onChange={e => setUnlockSection(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Selecione...</option>
                  <option value="frases">Frases em Francês</option>
                  <option value="ditados">Ditados em Francês</option>
                  <option value="curiosidades">Curiosidades!</option>
                  <option value="jogo">Jogo Principal</option>
                </select>
              </div>

              {/* Status atual */}
              {unlockSection && (
                <div className={`text-sm px-3 py-2 rounded-lg border ${
                  currentUnlocks[unlockSection]
                    ? 'bg-green-900/40 text-green-300 border-green-700'
                    : 'bg-gray-700/40 text-gray-400 border-gray-600'
                }`}>
                  <span>Status: {currentUnlocks[unlockSection] ? '🔓 Desbloqueada' : '🔒 Bloqueada'}</span>
                  {currentUnlocks[unlockSection] && expiryDates[unlockSection] && (
                    <span className="ml-2 text-yellow-300">
                      · Expira em {formatExpiry(expiryDates[unlockSection])}
                    </span>
                  )}
                </div>
              )}

              {/* Duração */}
              {!(unlockSection && currentUnlocks[unlockSection]) && (
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Duração do desbloqueio</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={unlockDuration}
                      onChange={e => setUnlockDuration(Math.max(1, Number(e.target.value)))}
                      className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <select
                      value={unlockUnit}
                      onChange={e => setUnlockUnit(e.target.value as UnlockDurationUnit)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                    >
                      <option value="hours">Hora(s)</option>
                      <option value="days">Dia(s)</option>
                      <option value="weeks">Semana(s)</option>
                    </select>
                  </div>
                  {unlockSection && (
                    <p className="text-xs text-gray-400 mt-1">
                      Expirará em: <span className="text-yellow-300">{formatExpiry(calcExpiryMs())}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Ações */}
              {unlockSection && currentUnlocks[unlockSection] ? (
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      // Re-unlock with new duration
                      const expiryMs = calcExpiryMs();
                      const res = await fetch('/api/admin-unlock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ section: unlockSection, expiryMs, action: 'unlock' }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        setCurrentUnlocks(prev => ({ ...prev, [unlockSection]: true }));
                        setExpiryDates(prev => ({ ...prev, [unlockSection]: expiryMs }));
                        setUnlockStatus(`✅ Prazo estendido por ${durationLabel()}.`);
                      }
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-lg transition cursor-pointer"
                  >
                    🔄 Estender prazo por {durationLabel()}
                  </button>
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
                        setExpiryDates(prev => { const n = { ...prev }; delete n[unlockSection]; return n; });
                        setUnlockStatus(`🔒 "${sectionLabels[unlockSection] || unlockSection}" bloqueada.`);
                      } else {
                        setUnlockStatus('❌ Erro ao bloquear.');
                      }
                    }}
                    className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition cursor-pointer"
                  >
                    🔒 Bloquear agora
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (!unlockSection) return;
                    const expiryMs = calcExpiryMs();
                    const res = await fetch('/api/admin-unlock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ section: unlockSection, expiryMs, action: 'unlock' }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setCurrentUnlocks(prev => ({ ...prev, [unlockSection]: true }));
                      setExpiryDates(prev => ({ ...prev, [unlockSection]: expiryMs }));
                      setUnlockStatus(`✅ "${sectionLabels[unlockSection] || unlockSection}" desbloqueada por ${durationLabel()}.`);
                    } else {
                      setUnlockStatus('❌ Erro ao desbloquear.');
                    }
                  }}
                  disabled={!unlockSection}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔓 Desbloquear por {durationLabel()}
                </button>
              )}

              {unlockStatus && (
                <p className="text-sm text-center mt-2 text-green-300">{unlockStatus}</p>
              )}

              {/* Resumo de todos os desbloqueios ativos */}
              {Object.keys(currentUnlocks).some(k => currentUnlocks[k]) && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Seções atualmente desbloqueadas</p>
                  <div className="space-y-1.5">
                    {Object.entries(currentUnlocks).filter(([, v]) => v).map(([key]) => (
                      <div key={key} className="flex items-center justify-between text-xs bg-green-900/20 border border-green-800/40 rounded-lg px-3 py-1.5">
                        <span className="text-green-300">🔓 {sectionLabels[key] || key}</span>
                        {expiryDates[key] && (
                          <span className="text-gray-400">até {formatExpiry(expiryDates[key])}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === IMAGE MANAGEMENT TAB === */}
        {activeTab === 'images' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-gray-800 rounded-2xl p-6 border border-purple-600/40 shadow-xl mb-6">
              <h2 className="text-xl font-bold text-purple-300 mb-1">🖼️ Gerenciamento de Imagens</h2>
              <p className="text-sm text-gray-400 mb-4">
                Visualize, valide ou remova imagens do banco de dados. Imagens marcadas como <span className="text-red-400">inválidas</span> não aparecem no jogo.
                Use isso para remover imagens que não correspondem ao título exibido.
              </p>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Coleção</label>
                  <select
                    value={imgCollection}
                    onChange={e => setImgCollection(e.target.value as any)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="images">Jogo Principal</option>
                    <option value="frases">Frases</option>
                    <option value="proverbs">Ditados/Provérbios</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Tema (opcional)</label>
                  <input
                    type="text"
                    value={imgTheme}
                    onChange={e => setImgTheme(e.target.value)}
                    placeholder="ex: família, natureza..."
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500 w-44"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => loadImages(1)}
                    disabled={imgLoading}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {imgLoading ? 'Carregando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {imgActionStatus && (
                <p className="text-sm text-green-300 mb-3">{imgActionStatus}</p>
              )}

              {imgList.length > 0 && (
                <p className="text-xs text-gray-400 mb-3">
                  Mostrando {imgList.length} de {imgTotal} imagens
                </p>
              )}
            </div>

            {/* Grid de imagens */}
            {imgList.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imgList.map((img) => (
                    <div
                      key={img._id}
                      className={`bg-gray-800 rounded-xl overflow-hidden border shadow-lg ${
                        img.validated === false
                          ? 'border-red-600/60'
                          : img.validated === true
                          ? 'border-green-600/60'
                          : 'border-gray-700'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-32 object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                        />
                        {img.source === 'ai' && (
                          <span className="absolute top-1 right-1 text-[9px] bg-black/70 text-cyan-300 px-1.5 py-0.5 rounded-full">IA</span>
                        )}
                        {img.validated === false && (
                          <span className="absolute top-1 left-1 text-[9px] bg-red-900/80 text-red-300 px-1.5 py-0.5 rounded-full">Inválida</span>
                        )}
                        {img.validated === true && (
                          <span className="absolute top-1 left-1 text-[9px] bg-green-900/80 text-green-300 px-1.5 py-0.5 rounded-full">Válida</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-white truncate" title={img.title}>{img.title}</p>
                        <p className="text-[10px] text-gray-400 mb-2">{img.theme}</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => validateImage(img._id, true)}
                            title="Marcar como válida"
                            className="flex-1 flex items-center justify-center gap-0.5 bg-green-900/40 hover:bg-green-800/60 border border-green-700/50 rounded text-green-300 text-[10px] py-1 transition cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => validateImage(img._id, false)}
                            title="Marcar como inválida (não aparece no jogo)"
                            className="flex-1 flex items-center justify-center gap-0.5 bg-yellow-900/40 hover:bg-yellow-800/60 border border-yellow-700/50 rounded text-yellow-300 text-[10px] py-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteImage(img._id)}
                            title="Remover permanentemente"
                            className="flex-1 flex items-center justify-center gap-0.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded text-red-300 text-[10px] py-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => loadImages(imgPage - 1)}
                      disabled={imgPage <= 1}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-40 cursor-pointer"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-400">Página {imgPage} de {totalPages}</span>
                    <button
                      onClick={() => loadImages(imgPage + 1)}
                      disabled={imgPage >= totalPages}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-40 cursor-pointer"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            ) : (
              !imgLoading && (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Clique em "Buscar" para carregar as imagens.</p>
                </div>
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
}
