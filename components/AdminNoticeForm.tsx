'use client'

import { useState } from 'react';

export default function AdminNoticeForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(1);  


  const handlePublish = async () => {
    const expirationDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000); // duração em dias

    const res = await fetch('/api/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        title,
        message,
        expiration: expirationDate.toISOString(),
        }),
    });

    if (res.ok) {
        alert('Aviso publicado com sucesso!');
        setTitle('');
        setMessage('');
        setDuration(1);
    } else {
        const data = await res.json();
        alert('Erro ao publicar: ' + data.error);
    }
  };
  
  
  return (
    <div className="fixed bottom-4 left-4 bg-white bg-opacity-10 backdrop-blur-md p-4 rounded-xl shadow-xl w-80 text-white z-30 border border-blue">
      <h2 className="text-lg font-bold mb-2">Criar Aviso</h2>

      <input
        type="text"
        placeholder="Título"
        className="w-full border border-blue px-3 py-1 mb-2 rounded-md text-black"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Mensagem"
        className="w-full border border-blue px-3 py-1 mb-2 rounded-md text-black"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <input
        type="number"
        placeholder="Duração (min)"
        className="w-full border border-blue px-3 py-1 mb-2 rounded-md text-black"
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        min={1}
      />

      <button
        className="bg-lightblue hover:bg-blue text-white px-4 py-1 rounded-md w-full transition duration-300 cursor-pointer"
        onClick={handlePublish}
      >
        Publicar Aviso
      </button>
    </div>
  );

}