import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastKind = "ok" | "error" | "warn" | "info";
type Toast = { id: number; kind: ToastKind; text: string };

let seq = 0;
const listeners = new Set<(t: Toast[]) => void>();
let items: Toast[] = [];

function emit() {
  for (const l of listeners) l([...items]);
}

/** Tampilkan notifikasi ringkas. Otomatis hilang. */
export function toast(text: string, kind: ToastKind = "info", ms = 3200) {
  const id = ++seq;
  items = [...items, { id, kind, text }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, ms);
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const ICON = { ok: CheckCircle2, error: XCircle, warn: TriangleAlert, info: Info } as const;
const TONE = {
  ok: "border-green-300 bg-green-50 text-green-900",
  error: "border-red-300 bg-red-50 text-red-900",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-slate-300 bg-white text-slate-800",
} as const;

export function Toaster() {
  const [list, setList] = useState<Toast[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);
  if (list.length === 0) return null;
  return (
    <div className="fixed z-[90] left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] w-[min(92vw,26rem)] flex flex-col gap-2"
      role="status" aria-live="polite">
      {list.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id}
            className={`anim-toast flex items-start gap-2.5 border rounded-xl px-3.5 py-3 shadow-[0_12px_32px_rgba(15,27,61,0.18)] ${TONE[t.kind]}`}>
            <Icon size={17} className="mt-0.5 shrink-0" aria-hidden />
            <span className="text-sm font-medium flex-1">{t.text}</span>
            <button onClick={() => dismissToast(t.id)} aria-label="Tutup notifikasi"
              className="p-1 -m-1 rounded-md hover:bg-black/5 shrink-0">
              <X size={15} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
