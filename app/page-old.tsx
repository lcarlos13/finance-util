"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function enviarImagem(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    setLoading(false);
    setMensagem("Imagem enviada com sucesso!");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Ler boleto</h1>

      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        capture="environment"
        onChange={enviarImagem}
      />

      {loading && <p>Enviando...</p>}
      {mensagem && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
          {mensagem}
          <button
            onClick={() => setMensagem(null)}
            className="block mt-2 text-sm underline"
          >
            OK
          </button>
        </div>
      )}
    </main>
    
  );
}