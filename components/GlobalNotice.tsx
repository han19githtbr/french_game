'use client'

import { useEffect, useState } from "react";

export default function GlobalNotice() {
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  
  
  useEffect(() => {
    const stored = localStorage.getItem('globalNotice');
    if (stored) {
      const data = JSON.parse(stored);
      if (new Date().getTime() < data.expiration) {
        setNotice({ title: data.title, message: data.message });
      }  
    }
  }, []);
  
  
  if (!notice) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex items-center justify-center">
      <div className="animate-pulse bg-yellow-300 text-black p-4 rounded-b-xl shadow-xl w-[90%] max-w-xl mt-2 text-center border-2 border-yellow-500">
        <h3 className="font-bold text-lg mb-1">{notice.title}</h3>
        <p>{notice.message}</p>
      </div>
    </div>
  );

}