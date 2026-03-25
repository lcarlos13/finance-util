export async function GET() {
  const imagem = globalThis.ultimaImagem;

  return Response.json({ imagem });
}