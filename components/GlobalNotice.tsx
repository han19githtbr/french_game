'use client';

import { useEffect, useState } from 'react';

type Notice = {
  title: string;
  message: string;
  expiration: string; // ISO string
};

export default function GlobalNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const res = await fetch('/api/notice');
        if (!res.ok) return;
        const data: Notice[] = await res.json();

        if (data.length > 0) {
          // Exibe o primeiro aviso (mais recente ou mais antigo dependendo da ordem)
          setNotice(data[0]);
        }
      } catch (error) {
        console.error('Erro ao buscar aviso:', error);
      }
    };

    fetchNotice();
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed top-2 left-3 w-64 z-50 flex items-left justify-left">
      <div className="animate-pulse-slow bg-transparent text-green p-4 rounded-xl shadow-xl w-[60%] max-w-xl mt-2 text-center">
        <h3 className="font-bold text-lg mb-1">{notice.title}</h3>
        <p>{notice.message}</p>
      </div>
    </div>
  );
}
