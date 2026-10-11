import { Card } from "../components/ui/controls";
import type { Proposal } from "../lib/proposals";
import { T } from "../ui-text";

export default function Step3({ p }: { p: Proposal }) {
  void p;

  return (
    <div className="anim-fade-up">
      <Card>
        <h2 className="font-bold text-lg text-white">{T.harga.judul}</h2>
        <p className="text-base text-slate-300 mt-2">{T.harga.segera}</p>
        <p className="text-sm text-slate-400 mt-1">
          Tabel RAB dengan harga proposal, persetujuan, dan unduhan .docx/.md/PDF.
        </p>
      </Card>
    </div>
  );
}
