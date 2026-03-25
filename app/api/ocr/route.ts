import { NextRequest, NextResponse } from "next/server";
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string
  ),
});

export async function POST(req: NextRequest) {
  try {
    const { imagem } = await req.json();

    const [result] = await client.textDetection({
      image: { content: imagem },
    });

    const texto = result.fullTextAnnotation?.text || "";

    return NextResponse.json({ texto });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro no OCR" }, { status: 500 });
  }
}