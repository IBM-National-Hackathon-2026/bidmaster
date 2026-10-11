import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card } from "../components/ui/controls";
import type { Item, Proposal } from "../lib/proposals";
import { T } from "../ui-text";

const STATUS_LABEL = { sesuai: "Sesuai", sebagian: "Sebagian", berisiko: "Berisiko" } as const;

export default function Step2({ p, goHarga, agent }: {
  p: Proposal;
  goHarga: () => void;
  agent: React.ReactNode;
}) {
  const [tab, setTab] = useState<"butir" | "bob">("butir");
  const [filter, setFilter] = useState(0);

  const counts = useMemo(() => {
    const c = { sesuai: 0, sebagian: 0, berisiko: 0, lemah: 0, baru: 0 };
    for (const it of p.items) {
      c[it.status]++;
      if (it.perlu_konfirmasi) c.lemah++;
    }
    return c;
  }, [p.items]);

  const shown = useMemo(() => {
    const arr = [...p.items].sort((a, b) =>
      (a.status === "berisiko" ? 0 : 1) - (b.status === "berisiko" ? 0 : 1));
    switch (filter) {
      case 1: return arr.filter((i) => i.status === "berisiko");
      case 2: return arr.filter((i) => i.status === "sebagian");
      case 3: return arr.filter((i) => i.status === "sesuai");
      case 4: return arr.filter((i) => i.perlu_konfirmasi);
      case 5: return [];
      default: return arr;
    }
  }, [p.items, filter]);

  const sisa = p.items.filter((i) => i.status === "berisiko").length;

  return (
    <div className="anim-fade-up">
      <Card>
        <h2 className="font-bold text-lg text-white">{T.tinjau.judul}</h2>
        <p className="text-sm text-slate-300 mt-1">
          {p.items.length} {T.tinjau.ringkasButir} · Sesuai {counts.sesuai} / Sebagian {counts.sebagian} / Berisiko {counts.berisiko}
        </p>
        <div className="flex gap-1.5 flex-wrap mt-3" role="group" aria-label="Filter butir">
          {T.tinjau.filter.map((f, i) => (
            <button key={f} onClick={() => setFilter(i)} aria-pressed={filter === i}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border-[1.5px] min-h-9 ${filter === i ? "bg-brand text-white border-brand" : "border-white/15 text-slate-300 hover:border-brand/60"}`}>
              {f}</button>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 mt-3" role="tablist" aria-label="Tinjau">
        {(["butir", "bob"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold min-h-11 ${tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>
            {t === "butir" ? T.tinjau.tabButir : T.tinjau.tabBob}</button>
        ))}
      </div>

      {tab === "butir" && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-400">{T.tinjau.risikoAtas}</p>
          {p.items.length === 0 && <Alert kind="warn">{T.tinjau.kosong}</Alert>}
          {shown.map((it: Item) => (
            <article key={it.id} className={`bg-surface border rounded-2xl p-4 ${it.status === "berisiko" ? "border-red-500/50" : "border-white/10"}`}>
              <div className="text-[0.72rem] uppercase tracking-wide text-slate-400">{it.kategori} · {it.id}</div>
              <p className="text-base text-slate-100 mt-1">{it.requirement || "(tanpa teks)"}</p>
              <div className="flex gap-2 flex-wrap mt-2 items-center">
                <Badge ok={it.status === "sesuai"}>{STATUS_LABEL[it.status]}</Badge>
                <span className="text-xs text-slate-400">{T.tinjau.keyakinan}: {it.keyakinan}</span>
                {it.perlu_konfirmasi && <Badge ok={false}>Perlu dikonfirmasi</Badge>}
              </div>
              {it.alasan !== "" && <p className="text-sm text-slate-300 mt-1">{T.tinjau.alasan}: {it.alasan}</p>}
              <div className="text-xs text-slate-400 mt-1">
                Sumber: {it.sumber_klien
                  ? `Klien — ${it.sumber_klien.baris ? "baris " + it.sumber_klien.baris : "hal. " + it.sumber_klien.halaman + ", par. " + it.sumber_klien.paragraf}`
                  : "—"}
                {it.sumber_knowledge.length > 0 && ` · Knowledge — ${it.sumber_knowledge.join(", ")}`}
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "bob" && <div className="mt-3">{agent}</div>}

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <Button onClick={goHarga} disabled={sisa > 0} aria-describedby="alasan-harga">{T.tinjau.lanjut}</Button>
        {sisa > 0 && <span id="alasan-harga" className="text-xs text-slate-400">{sisa}{T.tinjau.sisaRisiko}</span>}
      </div>
    </div>
  );
}
