import { Check } from "lucide-react";
import { T } from "../ui-text";

export function Steps({ current, can, reasons }: {
  current: number;
  can: [boolean, boolean, boolean];
  reasons: [string, string, string];
}) {
  return (
    <ol className="flex gap-1.5 list-none p-0" aria-label="Langkah proposal">
      {T.langkah.judul.map((t, i) => {
        const n = i + 1;
        const ok = can[i];
        const active = current === n;
        return (
          <li key={t} className="flex-1 min-w-0">
            <div title={ok ? T.langkah.ket[i] : reasons[i]}
              aria-current={active ? "step" : undefined}
              aria-disabled={!ok}
              className={`rounded-[10px] px-2.5 py-2 border-[1.5px] ${
                active ? "border-brand bg-brand-light"
                : ok ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100 opacity-70"}`}>
              <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-slate-600">
                Langkah {n}
                {n < current && ok && <Check size={12} className="text-green-600" aria-hidden />}
              </span>
              <span className="text-xs text-slate-700 truncate block">{t}</span>
              {!ok && <span className="block text-[0.7rem] text-slate-600">{reasons[i]}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
