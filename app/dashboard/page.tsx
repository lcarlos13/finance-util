"use client";

import Tesseract from "tesseract.js";
import { parseBoleto } from "@/lib/boleto";
import { useEffect, useState } from "react";

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

  async function carregarImagem() {
  try {
    const res = await fetch(
      `/api/imagem?ts=${Date.now()}`
    );

    const data = await res.json();

    if (data.imagem) {
      const novaImagem = `data:image/jpeg;base64,${data.imagem}`;

      // 🔥 só atualiza se mudou (evita reset desnecessário)
      if (novaImagem !== imagem) {
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
    setMensagem("Selecione o tipo do boleto");
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

     if (data.ok) {
      // ✅ mensagem de sucesso
      setMensagem("Inserido com sucesso!");

      // 🧹 limpa tudo
      setDados(null);
      setImagem(null);
    }

  } catch (err) {
    console.error("Erro ao salvar", err);
    setMensagem("Erro ao inserir na planilha");
  }
}

function normalizarTexto(texto: string) {
  return texto
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim();
}

function formatarData(match: RegExpMatchArray) {
  const dia = match[1];
  const mes = match[2];
  const ano = match[3];

  return `${dia}/${mes}/${ano}`;
}

function pareceData(texto: string) {
  return /\d{2}[\/\.\-]\d{2}[\/\.\-]\d{2,4}/.test(texto);
}

function pareceNumeroDocumento(texto: string) {
  return (
    /\d{3,}/.test(texto) && // tem números relevantes
    !texto.includes("CNPJ") &&
    !texto.includes("CPF") &&
    !pareceData(texto) &&
    texto.length < 25 // evita linhas gigantes
  );
}

function escolherMelhorNF(candidatos: string[]) {
  // prioridade:
  // 1. formato com barra (16321/1)
  const comBarra = candidatos.find(c => c.includes("/"));
  if (comBarra) return comBarra;

  // 2. menor string numérica limpa
  const ordenado = candidatos.sort((a, b) => a.length - b.length);
  return ordenado[0];
}

function normalizarData(texto: string) {
  const match = texto.match(/(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2,4})/);
  if (!match) return "";

  let dia = match[1];
  let mes = match[2];
  let ano = match[3];

  if (ano.length === 2) {
    ano = "20" + ano;
  }

  return `${dia}/${mes}/${ano}`;
}


function extrairDataDocumento(texto: string) {
  const linhas = texto.split("\n").map(l => l.trim());

  const regexData = /\d{2}[\/\.\-]\d{2}[\/\.\-]\d{2,4}/;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].toUpperCase();

    if (linha.includes("DATA") && linha.includes("DOCUMENTO")) {
      // 🔍 procura nas próximas linhas
      for (let j = 1; j <= 10; j++) {
        const alvo = linhas[i + j];
        if (!alvo) break;

        if (regexData.test(alvo)) {
            return alvo;
            //return normalizarData(alvo);
        }
      }
    }
  }

  return "";
}


function extrairNumeroDocumento(texto: string) {
  const linhas = texto.split("\n").map(l => l.trim());

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].toUpperCase();

    if (linha.includes("NUM") && linha.includes("DOCUMENTO") ||
         linha.includes("Nº") && linha.includes("DOCUMENTO") ||
         linha.includes("N") && linha.includes("DOCUMENTO")) {
      // 🔍 janela abaixo
      for (let j = 1; j <= 10; j++) {
        const alvo = linhas[i + j];
        if (!alvo) break;

        // 🚫 ignora lixo
        if (
          alvo.includes("CNPJ") ||
          alvo.includes("DATA") ||
          alvo.length > 30 ||
          alvo.length == 10
        ) continue;

        if (/\d{3,}/.test(alvo)) {
          return alvo.trim();
        }
      }
    }
  }

  return "Não identificado";
}


  async function extrairBoleto() {
  if (!imagem) return;

  setLoading(true);

  try {
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imagem: imagem.split(",")[1],
      }),
    });

    const data = await res.json();

    console.log("RETORNO OCR:", data);

    // 🚨 validação básica
    if (!data || !data.valor) {
      setMensagem("Erro ao ler o boleto, tente outra imagem");
      return;
    }

    // ✅ AGORA SIM — usa direto da API
    setDados({
      beneficiario: data.beneficiario || "",
      valor: data.valor || 0,
      vencimento: data.vencimento || "",
      tipo: "",
      numeroDocumento: data.numeroDocumento || "",
      dataDocumento: data.dataDocumento || "",
    });

  } catch (err) {
    console.error("Erro ao extrair boleto", err);
    setMensagem("Erro ao processar OCR");
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
        disabled={loading}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
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
          <input
            value={dados.numeroDocumento}
            onChange={(e) =>
                setDados({ ...dados, numeroDocumento: e.target.value })
            }
            className="border p-2 w-full"
            />

          <input
            value={dados.dataDocumento}
            onChange={(e) =>
                setDados({ ...dados, dataDocumento: e.target.value })
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
            <option value="PROTEÍNAS">PROTEÍNAS</option>
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