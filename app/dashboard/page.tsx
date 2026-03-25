"use client";

import Tesseract from "tesseract.js";
import { parseBoleto } from "@/lib/boleto";
import { useEffect, useState } from "react";

type DadosBoleto = {
  beneficiario: string;
  valor: number;
  vencimento: string | null;
  tipo: string;
};

export default function Dashboard() {
  const [imagem, setImagem] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosBoleto | null>(null);
  const [loading, setLoading] = useState(false);

  async function carregarImagem() {
  try {
    const res = await fetch(
      `/api/imagem?ts=${Date.now()}`
    );

    const data = await res.json();

    if (data.imagem) {
      const novaImagem = `data:image/jpeg;base64,${data.imagem}`;

      // 🔥 só atualiza se mudou (evita reset desnecessário)
      if (!dados && novaImagem !== imagem) {
        setImagem(novaImagem);
      }
    }
  } catch (err) {
    console.error("Erro ao carregar imagem", err);
  }
}

 function extrairBeneficiario(texto: string) {
  const linhas = texto
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const regexEmpresa = /\b(LTDA|EIRELI|S[\.\s\/]?A)\b/i;

  const blacklist = [
    "INSTRU",
    "PAGADOR",
    "SERASA",
    "BANCO",
    "VALOR",
    "DOCUMENTO",
    "VENCIMENTO",
    "DESCONTO",
    "MULTA",
    "JUROS",
    "AUTENTICA",
  ];

  // 🥇 procurar após "Beneficiário"
  for (let i = 0; i < linhas.length; i++) {
    const atual = linhas[i].toUpperCase();

    if (atual.includes("BENEFICI")) {
      for (let j = 1; j <= 10; j++) {
        const candidata = linhas[i + j];
        if (!candidata) continue;

        const limpa = candidata.replace(/[^\w\s./-]/g, "");
        const upper = limpa.toUpperCase();

        if (
          regexEmpresa.test(upper) &&
          !blacklist.some(b => upper.includes(b))
        ) {
          console.log("ACHOU NA JANELA:", candidata);
          return limparNome(candidata);
        }
      }
    }
  }

  // 🥈 fallback global
  const candidatos = linhas.filter((l) => {
    const upper = l.toUpperCase();

    return (
      regexEmpresa.test(upper) &&
      !blacklist.some(b => upper.includes(b))
    );
  });

  if (candidatos.length === 0) return "Não identificado";

  let melhor = candidatos.sort((a, b) => scoreLinha(b) - scoreLinha(a))[0];

  console.log("ACHOU NO FALLBACK:", melhor);

  return limparNome(melhor);
}

function scoreLinha(linha: string) {
  let score = 0;

  score += linha.split(" ").length;

  if (linha.length > 80) score -= 10;

  return score;
}

function limparNome(nome: string) {
  return nome
    .split(/CNPJ/i)[0]
    .trim();
}

async function inserirNaPlanilha() {
  if (!dados) return;

  if (!dados.tipo) {
    alert("Selecione o tipo");
    return;
  }

  try {
    const res = await fetch("/api/sheets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    const data = await res.json();

    console.log("Salvo em:", data.range);

    // 🔥 limpa tudo (como você queria)
    setDados(null);
    setImagem(null);

  } catch (err) {
    console.error("Erro ao salvar", err);
  }
}

  async function extrairBoleto() {
    if (!imagem) return;

    setLoading(true);

    try {
        // 🚀 chama sua API com Google Vision
        const res = await fetch("/api/ocr", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            imagem: imagem.split(",")[1], // remove prefixo base64
        }),
        });

        const data = await res.json();
        const texto = data.texto;

        console.log(texto);

        // 🔢 linha digitável
        const linhaMatch = texto.match(
        /\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}/
        );

        if (!linhaMatch) {
        setLoading(false);
        return;
        }

        const linhaDigitavel = linhaMatch[0].replace(/\D/g, "");
        console.log("Linha:", linhaDigitavel);

        // 💰 parse
        const resultado = parseBoleto(linhaDigitavel);

        console.log("Valor:", resultado.valor);
        console.log("Vencimento:", resultado.vencimento);

        // 👤 beneficiário (melhorado)
        let beneficiario = extrairBeneficiario(texto);
        console.log("Beneficiário:", beneficiario);

        // 📅 formatar data
        const vencimentoFormatado = resultado.vencimento
        ? resultado.vencimento.split("-").reverse().join("/")
        : "";

        // ✅ set dados
        setDados({
        beneficiario,
        valor: resultado.valor,
        vencimento: vencimentoFormatado,
        tipo: "",
        });

    } catch (err) {
        console.error("Erro ao extrair boleto", err);
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(carregarImagem, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  if (imagem) {
    setDados(null); // 🔥 limpa campos ao trocar imagem
  }
}, [imagem]);

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
        {loading ? "Extraindo..." : "Extrair boleto"}
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
          <select
            value={dados.tipo}
            onChange={(e) =>
                setDados({ ...dados, tipo: e.target.value })
            }
            className="border p-2 w-full bg-gray-900 text-white border-gray-600 rounded"
            >
            <option value="">SELECIONE O TIPO DO BOLETO</option>
            <option value="SECOS">SECOS</option>
            <option value="PROTEINAS">PROTEÍNAS</option>
            <option value="BEBIDAS">BEBIDAS</option>
           </select>

           <button
                onClick={inserirNaPlanilha}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
                >
                Inserir na planilha
            </button>
        </div>
      )}
    </main>
  );
}