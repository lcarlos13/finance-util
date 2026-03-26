import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "Sem arquivo" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // salvar temporariamente (memória simples)
  //globalThis.ultimaImagem = buffer.toString("base64");

  const dir = path.join(process.cwd(), "tmp");

  // cria pasta se não existir
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const filePath = path.join(dir, "imagem.jpg");

  fs.writeFileSync(filePath, buffer);

  return Response.json({ ok: true });
}