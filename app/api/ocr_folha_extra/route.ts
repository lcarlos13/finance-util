import { NextRequest, NextResponse } from "next/server";
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string
  ),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { erro: "Sem arquivo" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 🔥 OCR MELHOR (estrutura)
    const [result] = await client.documentTextDetection({
      image: { content: buffer },
    });

    const fullText = result.fullTextAnnotation;

    if (!fullText) {
      return NextResponse.json(
        { erro: "OCR falhou" },
        { status: 500 }
      );
    }

    const textoCompleto = fullText.text || "";
    const funcionario = extrairFuncionarioSimples(textoCompleto);
    const parsed = parseDocument(fullText, funcionario);

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Erro OCR folha:", error);

    return NextResponse.json(
      { erro: "Erro no OCR da folha" },
      { status: 500 }
    );
  }
}


function parseDocument(doc: any, funcionario: string) {
  const palavras: {
    text: string;
    x: number;
    y: number;
  }[] = [];

  for (const page of doc.pages) {
    for (const block of page.blocks) {
      for (const paragraph of block.paragraphs) {
        for (const word of paragraph.words) {
          const text = word.symbols.map((s: any) => s.text).join("");

          const vertices = word.boundingBox.vertices;
          const x = vertices?.[0]?.x ?? 0;
          const y = vertices?.[0]?.y ?? 0;

          palavras.push({ text, x, y });
        }
      }
    }
  }

  return extrairPorCoordenadas(palavras, funcionario);
}


function extrairFuncionarioSimples(texto: string) {
  return (
    texto
      .split("\n")[0]
      ?.replace(/\s+/g, " ")
      .trim() || "Não identificado"
  );
}


function extrairPorCoordenadas(
  palavras: { text: string; x: number; y: number }[],
  funcionario: string
) {
  const regexData = /\d{2}\/\d{2}\/\d{4}/;
  const regexHora = /\d{2}:\d{2}/;

  // 📅 identificar datas (coluna esquerda)
  const datas = palavras.filter((p) => regexData.test(p.text));

  // ordenar por Y
  datas.sort((a, b) => a.y - b.y);

  const dias: any[] = [];

  for (const dataObj of datas) {
    const data = dataObj.text;

    // 🎯 pegar palavras próximas no eixo Y (mesma linha)
    const linha = palavras.filter(
      (p) => Math.abs(p.y - dataObj.y) < 25 // tolerância
    );

    // ordenar por X (esquerda → direita)
    linha.sort((a, b) => a.x - b.x);

    const textosLinha = linha.map((p) => p.text.toUpperCase());

    const textoSemEspaco = textosLinha.join("").replace(/\s/g, "");
    const isFolga = textoSemEspaco.includes("FOLGA");

    // ⏱️ extrair horários da linha
    const horarios = linha
      .map((p) => p.text)
      .filter((t) => regexHora.test(t));

    dias.push({
      data,
      horarios: isFolga ? [] : horarios,
      folga: isFolga,
    });
  }

  return {
    funcionario,
    dias,
  };
}
