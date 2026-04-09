"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 space-y-8 text-center">
        
        {/* TÍTULO */}
        <h1 className="text-2xl font-bold text-gray-800">
          O que deseja fazer?
        </h1>

        {/* BOTÕES */}
        <div className="flex flex-col gap-4">
          
          {/* BOLETOS */}
          <Link
            href="/boleto"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl transition text-lg font-semibold shadow-sm hover:shadow-md"
          >
            📄 Boletos
          </Link>

          {/* FOLHA FUNC EXTRA */}
          <Link
            href="/folhafuncextra"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl transition text-lg font-semibold shadow-sm hover:shadow-md"
          >
            👥 Folha Func. Extra
          </Link>

        </div>
      </div>
    </main>
  );
}