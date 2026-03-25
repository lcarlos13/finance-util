export default function Dashboard() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Dashboard de Boletos
      </h1>

      <div className="border p-4 rounded">
        <p>Nenhum boleto carregado</p>
      </div>

      <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Exportar Excel
      </button>
    </main>
  );
}