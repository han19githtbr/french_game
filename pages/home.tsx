import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { ArrowRightOnRectangleIcon, ClockIcon, ArrowUpIcon,ArrowDownIcon } from '@heroicons/react/24/solid';



ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);


interface Activity {
  userId: string;
  email: string;
  loginTime: string;
  duration: number;
}

interface Analytics {
  totalLogins: number;
  avgDuration: number;
  peakHour: string;
  offPeakHour: string;
  hourlyCounts: number[];
}


export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);


  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchUserActivity();
    }
  }, [status, router]);


  const fetchUserActivity = async () => {
    const res = await fetch('/api/user-activity');
    const data = await res.json();
    setActivities(data.activities);
    setAnalytics(data.analytics);
  };


  if (status === 'loading') {
    return <div>Carregando...</div>;
  }


  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Logins por Hora',
        data: analytics?.hourlyCounts || Array(24).fill(0),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
      },
    ],
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        enabled: true,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 24,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };


  if (session) {
    const toggleDropdown = () => {
      setDropdownOpen(!dropdownOpen);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
        
        <div className="absolute top-4 right-4 flex items-center z-10">
          <div className="text-right mr-2">
            <span className="block text-gray-200 font-semibold text-sm md:text-base">
              {session?.user?.name || 'Administrador'}
            </span>
          </div>
          <button
            onClick={toggleDropdown}
            className="relative w-10 h-10 rounded-full overflow-hidden shadow-md transition duration-300 hover:scale-105 cursor-pointer"
          >
            {session?.user?.image ? (
              <Image src={session.user.image} alt={session.user.name ?? 'Admin'} layout="fill" objectFit="cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full border-2 border-lightblue bg-transparent hover:bg-blue text-gray-200 text-sm">
                <span>{session?.user?.name?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
            )}
          </button>
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
        <h1 className="absolute text-2xl font-thin text-gray-300 mb-6 mt-28 text-left z-30">Bem-vindo: <span className='text-green'>{session?.user?.name}</span></h1>

        <div className="w-full max-w-4xl mt-46">
          <h2 className="text-3xl text-gray-200 font-semibold mb-6 text-center">Atividade dos Usuários</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl text-blue font-semibold mb-4">Estatísticas Gerais</h3>
              <p className="text-gray-200 flex items-center">
                <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-200 mr-2" aria-hidden="true" />
                Total de Logins: <span className="text-blue ml-2">{analytics?.totalLogins || 0}</span>
              </p>
              <p className="text-gray-200 pt-2 flex items-center">
                <ClockIcon className="h-5 w-5 text-yellow mr-2" aria-hidden="true" />
                Duração Média da Sessão: <span className="text-blue ml-2">{analytics?.avgDuration || 0} minutos</span>
              </p>
              <p className="text-gray-200 pt-2 flex items-center">
                <ArrowUpIcon className="h-5 w-5 text-green mr-2" aria-hidden="true" />
                Horário de Pico: <span className="text-blue ml-2">{analytics?.peakHour || 'N/A'}</span>
              </p>
              <p className="text-gray-200 pt-2 flex items-center">
                <ArrowDownIcon className="h-5 w-5 text-red mr-2" aria-hidden="true" />
                Horário de Baixa: <span className="text-blue ml-2">{analytics?.offPeakHour || 'N/A'}</span>
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl text-blue font-semibold mb-4">Distribuição de Logins por Hora</h3>
              <div className="relative h-64">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
          <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl text-blue font-semibold mb-4 ml-4">Histórico de Navegação</h3>
            <div className="h-64 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 px-4 text-gray-200 sticky top-0 bg-gray-800">Email</th>
                      <th className="py-2 px-4 text-gray-200 sticky top-0 bg-gray-800">Data de Login</th>
                      <th className="py-2 px-4 text-gray-200 sticky top-0 bg-gray-800">Duração (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity, index) => (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="py-2 px-4">{activity.email}</td>
                        <td className="py-2 px-4 text-blue">{new Date(activity.loginTime).toLocaleString()}</td>
                        <td className="py-2 px-4 text-blue">{(activity.duration / 60).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return <div>Redirecionando...</div>;
}