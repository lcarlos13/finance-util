import { NextRequest, NextResponse } from "next/server";
import vision from "@google-cloud/vision";
import fs from "fs";
import path from "path";

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string
  ),
});

export async function POST(req: NextRequest) {
  try {
    //const { imagem } = await req.json();
    //const filePath = path.join(process.cwd(), "tmp", "imagem.jpg");
    const filePath = "/tmp/imagem.jpg";

    if (!fs.existsSync(filePath)) {
      return Response.json({ erro: "Imagem não encontrada" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);

    const [result] = await client.textDetection({
      image: { content: buffer },
    });

    const texto = result.fullTextAnnotation?.text || "";
    const texto_reduzido = texto.split("\n").slice(0, 200).join("\n");

    return NextResponse.json({ texto_reduzido });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro no OCR" }, { status: 500 });
  }
}