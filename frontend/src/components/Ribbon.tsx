import { T } from "../ui-text";

export function Ribbon() {
  return (
    <div role="note" aria-label="Peringatan sistem"
      className="bg-amber-50 border-b border-amber-200 text-amber-800 text-[0.83rem] px-4 py-2 text-center">
      {T.app.pita}
    </div>
  );
}
