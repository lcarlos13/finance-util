import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "tmp", "imagem.jpg");

  if (!fs.existsSync(filePath)) {
    return Response.json({ imagem: null });
  }

  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");

  return Response.json({ imagem: base64 });
}