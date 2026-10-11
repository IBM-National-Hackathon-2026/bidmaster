import { Info } from "lucide-react";
import { T } from "../ui-text";

export function Ribbon() {
  return (
    <div role="note" aria-label="Peringatan sistem"
      className="bg-amber-50/80 border-b border-amber-200/70 text-amber-800 text-xs sm:text-[0.83rem] px-4 py-2 flex items-center justify-center gap-2 text-center">
      <Info size={14} className="shrink-0" aria-hidden />
      <span>{T.app.pita}</span>
    </div>
  );
}
