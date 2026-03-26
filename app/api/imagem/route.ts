// /api/imagem/route.ts
export async function GET(req: Request) {
  if (!globalThis.ultimaImagem) {
    return new Response(JSON.stringify({ imagem: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ imagem: globalThis.ultimaImagem }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}