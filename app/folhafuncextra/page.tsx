"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OCRPonto = {
  funcionario: string;
  dias: {
    data: string;
    horarios: string[];
    folga?: boolean;
  }[];
};

export default function PontoOCR() {
  const [imagem, setImagem] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const router = useRouter();

  async function extrairPonto() {
    if (!arquivo) {
      setMensagem("Selecione uma imagem primeiro");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", arquivo);

      const res = await fetch("/api/ocr_folha_extra", {
        method: "POST",
        body: formData,
      });

      let data;

      try {
         data = await res.json();
      } catch {
         setMensagem("Erro na resposta da API");
         return;
      }

      if (!data || !data.dias) {
        setMensagem("Erro ao ler a folha, tente outra imagem");
        return;
      }

      // 👉 salva para próxima tela
      localStorage.setItem("pontoOCR", JSON.stringify(data));

      // 👉 redireciona
      router.push("/ajuste");
      console.log(data);

    } catch (err) {
      console.error(err);
      setMensagem("Erro ao processar OCR");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (imagem) {
      setMensagem(null);
    }
  }, [imagem]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            Leitura de Folha de Func. Extra
          </h1>

          <Link
            href="/"
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition"
          >
            ← Home
          </Link>
        </div>

        {/* UPLOAD */}
        <label className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl cursor-pointer transition">
          📸 Tirar foto da folha
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const img = new Image();
              const reader = new FileReader();

              reader.onload = () => {
                img.src = reader.result as string;
              };

              img.onload = () => {
                const canvas = document.createElement("canvas");

                const MAX_WIDTH = 1200;
                const scale = MAX_WIDTH / img.width;

                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                  if (!blob) return;

                  const compressedFile = new File([blob], "ponto.jpg", {
                    type: "image/jpeg",
                  });

                  setArquivo(compressedFile);

                  const previewReader = new FileReader();
                  previewReader.onload = () => {
                    setImagem(previewReader.result as string);
                  };
                  previewReader.readAsDataURL(compressedFile);
                }, "image/jpeg", 0.7);
              };

              reader.readAsDataURL(file);
            }}
          />
        </label>

        {/* PREVIEW */}
        {imagem ? (
          <img
            src={imagem}
            className="w-full rounded-xl border shadow-sm"
          />
        ) : (
          <p className="text-center text-gray-500">
            Aguardando imagem da folha...
          </p>
        )}

        {/* OCR BUTTON */}
        <button
          onClick={extrairPonto}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Extraindo..." : "Extrair informações"}
        </button>

        {/* MENSAGEM */}
        {mensagem && (
          <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-xl">
            <div className="flex justify-between items-center">
              <span>{mensagem}</span>
              <button
                onClick={() => setMensagem(null)}
                className="text-sm underline"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}