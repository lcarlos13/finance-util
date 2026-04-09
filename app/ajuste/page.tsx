"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";


type Dia = {
  data: string;
  horarios: string[];
};

type GridState = {
  [key: string]: string;
};

type OrigemState = {
  [key: string]: "ocr" | "manual";
};

const CAMPOS = [
  "entrada",
  "inicio_almoco",
  "saida_almoco",
  "intervalo",
  "retorno",
  "saida",
];

export default function AjustePage() {
  const [funcionario, setFuncionario] = useState("");
  const [dias, setDias] = useState<Dia[]>([]);
  const [grid, setGrid] = useState<GridState>({});
  const [origem, setOrigem] = useState<OrigemState>({});
  const [pool, setPool] = useState<{ id: string; label: string }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("pontoOCR");
    if (!stored) return;

    const parsed = JSON.parse(stored);

    setFuncionario(parsed.funcionario);
    setDias(parsed.dias);

    const initialGrid: GridState = {};
    const origemMap: OrigemState = {};
    const horariosPool: { id: string; label: string }[] = [];

    parsed.dias.forEach((dia: Dia) => {
      dia.horarios.forEach((h, i) => {
        const campo = CAMPOS[i];

        if (campo) {
          const key = `${dia.data}-${campo}`;
          initialGrid[key] = h;
          origemMap[key] = "ocr";
        } else {
          horariosPool.push({
            id: `${h}-${Math.random()}`,
            label: h,
          });
        }
      });
    });

    setGrid(initialGrid);
    setOrigem(origemMap);
    setPool(horariosPool);
  }, []);


async function salvarPlanilha() {
  try {
    const res = await fetch("/api/sheets_folha_extra", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        funcionario,
        dias,
        grid,
      }),
    });

    const data = await res.json();

    if (data.ok) {
      setMensagem("Salvo com sucesso!");

      // redireciona depois do toast desaparecer (2s de animação + 0.3s de slide)
      setTimeout(() => {
        window.location.href = "/folhafuncextra";
      }, 2300); 

    } else {
      setMensagem("Erro ao salvar");
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar");
  }
}


  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;

    const sourceId = active.data.current?.sourceId;
    const targetId = over.id;
    const value = active.data.current?.label;

    setGrid((prev) => {
      const newGrid = { ...prev };

      if (sourceId) newGrid[sourceId] = "";
      newGrid[targetId] = value;

      return newGrid;
    });

    // 🔥 destino vira OCR (arrastável)
    setOrigem((prev) => ({
      ...prev,
      [targetId]: "ocr",
      ...(sourceId ? { [sourceId]: "manual" } : {}),
    }));
  }

  if (!mounted) return null;

  return (
    <main className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800">
      <input
        value={funcionario}
        onChange={(e) => setFuncionario(e.target.value)}
        className="text-xl font-bold border-b outline-none bg-transparent"
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Pool */}
        <div className="flex items-center gap-4 flex-wrap">
          {pool.map((item) => (
            <DraggableItem key={item.id} id={item.id} label={item.label} />
          ))}

          <DraggableItem id="folga" label="FOLGA" />

          <span className="text-sm text-gray-600">
            Arraste os campos destacados para a posição desejada
          </span>
        </div>

        {/* Grid */}
        <div className="mt-6 border rounded overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-800 text-white font-semibold">
            <div className="p-2">Data</div>
            <div className="p-2">Entrada</div>
            <div className="p-2">Início Almoço</div>
            <div className="p-2">Saída Almoço</div>
            <div className="p-2">Intervalo</div>
            <div className="p-2">Retorno</div>
            <div className="p-2">Saída</div>
          </div>

          {dias.map((dia) => (
            <div key={dia.data} className="grid grid-cols-7 border-t bg-white">
              <div className="p-2">{dia.data}</div>

              {CAMPOS.map((campo) => {
                const id = `${dia.data}-${campo}`;

                return (
                  <DroppableInput
                    key={id}
                    id={id}
                    value={grid[id] || ""}
                    isOCR={origem[id] === "ocr"}
                    onChange={(val) => {
                      setGrid((prev) => ({
                        ...prev,
                        [id]: val,
                      }));

                      setOrigem((prev) => ({
                        ...prev,
                        [id]: "manual",
                      }));
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </DndContext>
      <button
        onClick={salvarPlanilha}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition w-48 text-center"
        >
        Salvar na Planilha
       </button>
      {/* MENSAGEM */}
        {mensagem && (
        <div
            className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg animate-slide-in animate-fade-out"
        >
            {mensagem}
        </div>
       )}
    </main>
  );
}

function DraggableItem({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { label },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab border-2 border-blue-500 bg-blue-100 px-3 py-1 rounded"
    >
      {label}
    </div>
  );
}

function DraggableCell({
  id,
  label,
  sourceId,
}: {
  id: string;
  label: string;
  sourceId: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { label, sourceId },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 999,
        position: "relative" as const,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-2 border-blue-500 rounded bg-white"
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab text-center px-2 py-1 select-none"
      >
        {label}
      </div>
    </div>
  );
}

function DroppableInput({
  id,
  value,
  isOCR,
  onChange,
}: {
  id: string;
  value: string;
  isOCR: boolean;
  onChange: (v: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id });

  function formatHora(v: string) {
    v = v.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) return v.slice(0, 2) + ":" + v.slice(2);
    return v;
  }

  return (
    <div ref={setNodeRef} className="p-1">
      {value && isOCR ? (
        <DraggableCell id={`${id}-${value}`} label={value} sourceId={id} />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(formatHora(e.target.value))}
          placeholder="00:00"
          className="w-full text-center border rounded"
        />
      )}
    </div>
  );
}