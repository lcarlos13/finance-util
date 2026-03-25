"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

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
    alert("Imagem enviada!");
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Ler boleto</h1>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={enviarImagem}
      />

      {loading && <p>Enviando...</p>}
    </main>
  );
}