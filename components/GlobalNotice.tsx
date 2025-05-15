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
        const data: Notice = await res.json();
        const isExpired = new Date(data.expiration) < new Date();
        if (!isExpired) setNotice(data);
      } catch (error) {
        console.error('Erro ao buscar aviso:', error);
      }
    };

    fetchNotice();
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed top-0 left-0 w-64 z-50 flex items-center justify-center">
      <div className="animate-pulse-slow bg-transparent text-green p-4 rounded-xl shadow-xl w-[60%] max-w-xl mt-2 text-center">
        <h3 className="font-bold text-lg mb-1">{notice.title}</h3>
        <p>{notice.message}</p>
      </div>
    </div>
  );
}
