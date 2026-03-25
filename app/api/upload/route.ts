export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "Sem arquivo" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // salvar temporariamente (memória simples)
  globalThis.ultimaImagem = buffer.toString("base64");

  return Response.json({ ok: true });
}