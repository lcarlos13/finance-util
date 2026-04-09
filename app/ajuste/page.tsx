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

type Dia = { data: string; horarios: string[] };
type GridState = { [key: string]: string };
type OrigemState = { [key: string]: "ocr" | "manual" };

const CAMPOS = ["entrada","inicio_almoco","saida_almoco","intervalo","retorno","saida"];

export default function AjustePage() {
  const [funcionario, setFuncionario] = useState("");
  const [dias, setDias] = useState<Dia[]>([]);
  const [grid, setGrid] = useState<GridState>({});
  const [origem, setOrigem] = useState<OrigemState>({});
  const [pool, setPool] = useState<{ id: string; label: string }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  useEffect(() => setMounted(true), []);

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
          horariosPool.push({ id: `${h}-${Math.random()}`, label: h });
        }
      });
    });

    setGrid(initialGrid);
    setOrigem(origemMap);
    setPool(horariosPool);
  }, []);

  function formatHoraInput(value: string) {
    // Remove tudo que não é número
    let v = value.replace(/[^\d]/g,"");
    if (v.length === 0) return "";
    if (v.length <= 2) return v;        // só horas
    return v.slice(0,2) + ":" + v.slice(2,4); // HH:MM
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    const value = active.data.current?.label;
    const sourceId = active.data.current?.sourceId;
    const targetId = over.id;
    if (!value) return;

    setGrid(prev => {
      const newGrid = { ...prev };
      if (sourceId && sourceId in newGrid) newGrid[sourceId] = "";
      newGrid[targetId] = value;
      return newGrid;
    });

    setOrigem(prev => ({
      ...prev,
      [targetId]: "ocr",
      ...(sourceId ? { [sourceId]: "manual" } : {}),
    }));

    // Remove do pool se estiver vindo do pool
    setPool(prev => prev.filter(item => item.id !== sourceId));
  }

  async function salvarPlanilha() {
    try {
      const res = await fetch("/api/sheets_folha_extra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funcionario, dias, grid }),
      });
      const data = await res.json();
      if (data.ok) {
        setMensagem("Salvo com sucesso!");
        setTimeout(() => (window.location.href="/folhafuncextra"),2000);
      } else setMensagem("Erro ao salvar");
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao salvar");
    }
  }

  if (!mounted) return null;

  return (
    <main className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800">
      <input
        value={funcionario}
        onChange={(e)=>setFuncionario(e.target.value)}
        className="text-xl font-bold border-b outline-none bg-transparent"
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Pool */}
        <div className="flex items-center gap-4 flex-wrap">
          {pool.map(item => (
            <DraggableValue key={item.id} id={item.id} label={item.label} sourceId={item.id} />
          ))}
          <DraggableValue id="folga" label="FOLGA" sourceId="folga" />
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

          {dias.map(dia => (
            <div key={dia.data} className="grid grid-cols-7 border-t bg-white">
              <div className="p-2">{dia.data}</div>
              {CAMPOS.map(campo => {
                const id = `${dia.data}-${campo}`;
                return (
                  <DroppableInput
                    key={id}
                    id={id}
                    value={grid[id] || ""}
                    isOCR={origem[id]==="ocr"}
                    onChange={v => {
                      setGrid(prev => ({ ...prev, [id]: v }));
                      setOrigem(prev => ({ ...prev, [id]: "manual" }));
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

      {mensagem && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg">
          {mensagem}
        </div>
      )}
    </main>
  );
}

// DraggableValue separado apenas para valores OCR/Pool
function DraggableValue({
  id,
  label,
  sourceId
}: { id:string, label:string, sourceId:string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data:{ label, sourceId }
  });

  const style = transform
    ? { transform:`translate(${transform.x}px,${transform.y}px)`, zIndex:999, position:"relative" as const }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center border-2 border-blue-500 bg-blue-100 rounded mb-1 select-none touch-none min-w-0"
    >
      {/* Pegador menor */}
      <div {...listeners} className="cursor-grab px-2 py-1 bg-blue-200 rounded-l text-sm">☰</div>

      {/* Input / Label */}
      <div className="flex-1 text-center px-1 py-1 overflow-hidden truncate">{label}</div>
    </div>
  );
}

// DroppableInput separa input de draggables
function DroppableInput({
  id, value, isOCR, onChange
}: { id:string, value:string, isOCR:boolean, onChange:(v:string)=>void }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="p-1 min-w-[60px]">
      {value && isOCR ? (
        <DraggableValue id={`${id}-${value}`} label={value} sourceId={id} />
      ) : (
        <input
          value={value}
          onChange={e=>onChange(formatHoraInput(e.target.value))}
          placeholder="00:00"
          className="w-full text-center border rounded px-2 py-1 box-border"
        />
      )}
    </div>
  );
}

function formatHoraInput(value: string) {
  let v = value.replace(/[^\d]/g,"");
  if (v.length === 0) return "";
  if (v.length <= 2) return v;
  return v.slice(0,2) + ":" + v.slice(2,4);
}