export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Leitor de Boletos</h1>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="border p-2"
      />

      <p className="text-sm text-gray-500">
        Tire uma foto do boleto
      </p>
    </main>
  );
}