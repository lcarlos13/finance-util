"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DadosBoleto = {
  beneficiario: string;
  valor: number;
  vencimento: string | null;
  tipo: string;
  numeroDocumento: string;
  dataDocumento: string;
};

export default function Dashboard() {
  const [imagem, setImagem] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosBoleto | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function extrairBoleto() {
    if (!arquivo) {
      setMensagem("Selecione uma imagem primeiro");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", arquivo);

      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data || !data.valor) {
        setMensagem("Erro ao ler o boleto, tente outra imagem");
        return;
      }

      setDados({
        beneficiario: data.beneficiario || "",
        valor: data.valor || 0,
        vencimento: data.vencimento || "",
        tipo: "",
        numeroDocumento: data.numeroDocumento || "",
        dataDocumento: data.dataDocumento || "",
      });
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao processar OCR");
    } finally {
      setLoading(false);
    }
  }

  async function inserirNaPlanilha() {
    if (!dados) return;

    if (!dados.tipo) {
      setMensagem("Selecione o tipo do boleto");
      return;
    }

    let api = "/api/sheets";
    if (!["SECOS", "PROTEÍNAS", "BEBIDAS"].includes(dados.tipo)) {
      api = "/api/sheets/generalreport";
    }

    try {
      const res = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      });

      const data = await res.json();

      if (data.ok) {
        setMensagem("Inserido com sucesso!");
        setDados(null);
        setImagem(null);
      }
    } catch {
      setMensagem("Erro ao inserir na planilha");
    }
  }

  useEffect(() => {
    if (imagem) {
      setDados(null);
    }
  }, [imagem]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard
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
          📸 Tirar foto do boleto
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

                  const compressedFile = new File([blob], "boleto.jpg", {
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
            Aguardando boleto...
          </p>
        )}

        {/* OCR BUTTON */}
        <button
          onClick={extrairBoleto}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Extraindo..." : "Extrair boleto"}
        </button>

        {/* FORM */}
        {dados && (
          <div className="space-y-4">
            
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Beneficiário
              </label>
              <input
                value={dados.beneficiario}
                onChange={(e) =>
                  setDados({ ...dados, beneficiario: e.target.value })
                }
                className="border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Valor
              </label>
              <input
                value={dados.valor}
                onChange={(e) =>
                  setDados({ ...dados, valor: Number(e.target.value) })
                }
                className="border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Vencimento
              </label>
              <input
                value={dados.vencimento || ""}
                onChange={(e) =>
                  setDados({ ...dados, vencimento: e.target.value })
                }
                className="border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                NF
              </label>
              <input
                value={dados.numeroDocumento}
                onChange={(e) =>
                  setDados({ ...dados, numeroDocumento: e.target.value })
                }
                className="border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Data de entrega
              </label>
              <input
                value={dados.dataDocumento}
                onChange={(e) =>
                  setDados({ ...dados, dataDocumento: e.target.value })
                }
                className="border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 w-full rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Tipo do Boleto
              </label>
              <select
                value={dados.tipo}
                onChange={(e) =>
                  setDados({ ...dados, tipo: e.target.value })
                }
                className="border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 w-full rounded-lg bg-white"
              >
                <option value="">SELECIONE</option>
                <option value="SECOS">SECOS</option>
                <option value="PROTEÍNAS">PROTEÍNAS</option>
                <option value="BEBIDAS">BEBIDAS</option>
                <option value="ENCARGOS SOCIAIS">ENCARGOS SOCIAIS</option>
                <option value="HONORÁRIOS">HONORÁRIOS</option>
                <option value="MANUTENÇÃO">MANUTENÇÃO</option>
                <option value="DESPESAS FIXAS">DESPESAS FIXAS</option>
                <option value="MATERIAL DE LIMPEZA">MATERIAL DE LIMPEZA</option>
                <option value="ALUGUÉIS">ALUGUÉIS</option>
                <option value="DESPESAS DIVERSAS">DESPESAS DIVERSAS</option>
              </select>
            </div>

            <button
              onClick={inserirNaPlanilha}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition"
            >
              Inserir na planilha
            </button>
          </div>
        )}

        {/* MENSAGEM */}
        {mensagem && (
          <div className="p-4 bg-green-50 border border-green-300 text-green-800 rounded-xl">
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