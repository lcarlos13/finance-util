import { NextRequest, NextResponse } from "next/server";
import vision from "@google-cloud/vision";
import { parseBoleto } from "@/lib/boleto";
import fs from "fs";
import path from "path";

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string
  ),
});

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
   //console.log(linhas);

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
          alvo.includes("/0001") ||
          alvo.includes("DATA") ||
          alvo.includes("CARRO") ||
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


export async function POST(req: NextRequest) {
  try {
    const { imagem } = await req.json();
    //const filePath = path.join(process.cwd(), "tmp", "imagem.jpg");
    //const filePath = "/tmp/imagem.jpg";

    const [result] = await client.textDetection({
      image: { content: imagem },
    });

    const texto = result.fullTextAnnotation?.text || "";

    // 🔢 linha digitável
    const linhaMatch = texto.match(
    /\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}/
    );

    if (!linhaMatch) {
        console.log("Linha nao capturada");
        return NextResponse.json(
          { erro: "Linha digitável não capturada" },
          { status: 400 }
        );
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

    const numeroDocumento = extrairNumeroDocumento(texto);
    let dataDocumento = extrairDataDocumento(texto);

    console.log("NF:", numeroDocumento);

    if (dataDocumento.includes(".")) {
      dataDocumento = dataDocumento.replaceAll(".","/");
    }
    console.log("Data Documento:", dataDocumento);
    

    //return NextResponse.json({ texto });
    return NextResponse.json({
            beneficiario,
            valor: resultado.valor,
            vencimento: vencimentoFormatado,
            tipo: "",
            numeroDocumento,
            dataDocumento,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro no OCR" }, { status: 500 });
  }
}