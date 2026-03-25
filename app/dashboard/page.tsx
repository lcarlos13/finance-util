"use client";

import Tesseract from "tesseract.js";
import { parseBoleto } from "@/lib/boleto";
import { useEffect, useState } from "react";

type DadosBoleto = {
  beneficiario: string;
  valor: number;
  vencimento: string | null;
};

export default function Dashboard() {
  const [imagem, setImagem] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosBoleto | null>(null);

  async function carregarImagem() {
    try {
      const res = await fetch(`${window.location.origin}/api/imagem`);
      const data = await res.json();

      if (data.imagem) {
        setImagem(`data:image/jpeg;base64,${data.imagem}`);
      }
    } catch (err) {
      console.error("Erro ao carregar imagem", err);
    }
  }

  async function extrairBoleto() {
    if (!imagem) return;

    try {
        const result = await Tesseract.recognize(imagem, "por");
        const texto = result.data.text;

        console.log(texto);

        const linhaMatch = texto.match(
            /\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}/
        );

        if (!linhaMatch) {
            alert("Linha digitável não encontrada");
            return;
        }

        const linhaDigitavel = linhaMatch[0].replace(/\D/g, "");
        console.log("Linha:", linhaDigitavel);

        const resultado = parseBoleto(linhaDigitavel);

        console.log("Valor:", resultado.valor);
        console.log("Vencimento:", resultado.vencimento);

        const match = texto.match(/Benefici[áa]rio:\s*(.+?)(CNPJ|NPJ|CPF|$)/i);

        const beneficiario = match
            ? match[1].trim()
            : "Não identificado";

        console.log("Beneficiário:", beneficiario);

        // ✅ SET DADOS (corrigido)
        setDados({
            beneficiario,
            valor: resultado.valor,
            vencimento: resultado.vencimento
                ? resultado.vencimento.split("-").reverse().join("/")
                : "",
        });

    } catch (err) {
      console.error("Erro ao extrair boleto", err);
    }
  }

  useEffect(() => {
    const interval = setInterval(carregarImagem, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {imagem ? (
        <img src={imagem} className="max-w-md border" />
      ) : (
        <p>Aguardando boleto...</p>
      )}

      <button
        onClick={extrairBoleto}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
      >
        Extrair boleto
      </button>

      {dados && (
        <div className="mt-4 space-y-2">
          <input
            value={dados.beneficiario}
            onChange={(e) =>
              setDados({ ...dados, beneficiario: e.target.value })
            }
            className="border p-2 w-full"
          />

          <input
            value={dados.valor}
            onChange={(e) =>
              setDados({ ...dados, valor: Number(e.target.value) })
            }
            className="border p-2 w-full"
          />

          <input
            value={dados.vencimento || ""}
            onChange={(e) =>
              setDados({ ...dados, vencimento: e.target.value })
            }
            className="border p-2 w-full"
          />
        </div>
      )}
    </main>
  );
}