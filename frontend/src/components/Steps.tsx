import { Check } from "lucide-react";
import { T } from "../ui-text";

export function Steps({ current, can, reasons }: {
  current: number;
  can: [boolean, boolean, boolean];
  reasons: [string, string, string];
}) {
  return (
    <ol className="flex gap-2 list-none p-0" aria-label="Langkah proposal">
      {T.langkah.judul.map((t, i) => {
        const n = i + 1;
        const ok = can[i];
        const active = current === n;
        const done = n < current && ok;
        return (
          <li key={t} className="flex-1 min-w-0">
            <div title={ok ? T.langkah.ket[i] : reasons[i]}
              aria-current={active ? "step" : undefined}
              aria-disabled={!ok}
              className={`h-full rounded-2xl px-3 py-3 border-[1.5px] transition-all ${
                active ? "border-brand bg-white shadow-[0_8px_24px_rgba(15,27,61,0.12)]"
                : done ? "border-green-300 bg-green-50/60"
                : ok ? "border-[#C9DDEE] bg-white"
                : "border-slate-200 bg-slate-100/70 opacity-80"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? "bg-green-500 text-white"
                  : active ? "grad-brand text-white"
                  : ok ? "bg-slate-200 text-slate-700" : "bg-slate-200 text-slate-500"}`}>
                  {done ? <Check size={14} aria-hidden /> : n}
                </span>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 truncate">
                  Langkah {n}
                </span>
              </div>
              <span className={`block mt-1.5 font-bold text-sm truncate ${active ? "text-[#0F1B3D]" : "text-slate-700"}`}>{t}</span>
              <span className="hidden sm:block text-xs text-slate-500 truncate">{ok ? T.langkah.ket[i] : reasons[i]}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
