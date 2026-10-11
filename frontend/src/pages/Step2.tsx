import { useMemo, useState } from "react";
import { SourceButton, SourcePanel, type SourceRef } from "../components/SourcePanel";
import { Alert, Badge, Button, Card } from "../components/ui/controls";
import { type Decision, type Item, type Proposal } from "../lib/proposals";
import { T } from "../ui-text";
import { api, authHeaders } from "../lib/utils";

const STATUS_LABEL = { sesuai: "Sesuai", sebagian: "Sebagian", berisiko: "Berisiko" } as const;

export default function Step2({ p, setP, goHarga, agent }: {
  p: Proposal;
  setP: (p: Proposal) => void;
  goHarga: () => void;
  agent: React.ReactNode;
}) {
  const [tab, setTab] = useState<"butir" | "bob">("butir");
  const [filter, setFilter] = useState(0);
  const [panel, setPanel] = useState<{ s: SourceRef; anchor: HTMLElement } | null>(null);
  const [dec, setDec] = useState<Record<string, { putusan: string; status: string; alasan: string; catatan: string; pertanyaan: string }>>({});
  const [massal, setMassal] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const decisions: Record<string, Decision> = p.decisions ?? {};
  const items: Item[] = p.items ?? [];

  const counts = useMemo(() => {
    const c = { sesuai: 0, sebagian: 0, berisiko: 0 };
    for (const it of items) c[it.status]++;
    return c;
  }, [items]);
  const diputus = Object.keys(decisions).length;

  const shown = useMemo(() => {
    const arr = [...items].sort((a, b) =>
      (a.status === "berisiko" ? 0 : 1) - (b.status === "berisiko" ? 0 : 1));
    switch (filter) {
      case 1: return arr.filter((i) => i.status === "berisiko");
      case 2: return arr.filter((i) => i.status === "sebagian");
      case 3: return arr.filter((i) => i.status === "sesuai");
      case 4: return arr.filter((i) => i.perlu_konfirmasi);
      case 5: return arr.filter((i) => !decisions[i.id]);
      default: return arr;
    }
  }, [items, filter, decisions]);

  const sisa = items.filter((i) => i.status === "berisiko" && !decisions[i.id]).length;
  const kandidatMassal = items.filter((i) => i.status === "sesuai" && i.keyakinan === "tinggi" && !i.perlu_konfirmasi && !decisions[i.id]).length;
  const nextRisk = items.find((i) => i.status === "berisiko" && !decisions[i.id]);

  function srcKlien(it: Item): SourceRef | null {
    const s = it.sumber_klien;
    if (!s) return null;
    if (s.baris) return { kind: "klien", baris: s.baris, kutipan: it.kutipan };
    if (s.halaman && s.paragraf) return { kind: "klien", halaman: s.halaman, paragraf: s.paragraf, kutipan: it.kutipan };
    return null;
  }

  async function simpan(id: string) {
    const d = dec[id];
    if (!d) return;
    setErr("");
    setBusy(id);
    try {
      const j = await api<{ proposal: Proposal }>(`/api/proposals/${p.id}/items/${id}/decision`, {
        method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ putusan: d.putusan, status: d.status || undefined, alasan: d.alasan, catatan: d.catatan, pertanyaan: d.pertanyaan }),
      });
      setP(j.proposal);
      setDec((m) => { const n = { ...m }; delete n[id]; return n; });
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    } finally {
      setBusy("");
    }
  }

  async function massalGo() {
    setErr("");
    try {
      const j = await api<{ proposal: Proposal; disetujui: number }>(`/api/proposals/${p.id}/approve-sesuai`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ konfirmasi: true }),
      });
      setP(j.proposal);
      setMassal(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }

  function startDec(id: string, putusan: string) {
    setDec((m) => ({ ...m, [id]: m[id] ?? { putusan, status: "sesuai", alasan: "", catatan: "", pertanyaan: "" } }));
    if (putusan !== (dec[id]?.putusan ?? "")) {
      setDec((m) => ({ ...m, [id]: { ...(m[id] ?? { status: "sesuai", alasan: "", catatan: "", pertanyaan: "" }), putusan } }));
    }
  }

  return (
    <div className="anim-fade-up">
      <Card>
        <h2 className="font-bold text-lg text-[#0F1B3D]">{T.tinjau.judul}</h2>
        <p className="text-sm text-slate-600 mt-1">
          {items.length} {T.tinjau.ringkasButir} · Sesuai {counts.sesuai} / Sebagian {counts.sebagian} / Berisiko {counts.berisiko}
          {" · "}{T.tinjau.progresDiputus} {diputus} {T.tinjau.dariButir} {items.length}
        </p>
        <div className="flex gap-1.5 flex-wrap mt-3" role="group" aria-label="Filter butir">
          {T.tinjau.filter.map((f, i) => (
            <button key={f} onClick={() => setFilter(i)} aria-pressed={filter === i}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border-[1.5px] min-h-9 ${filter === i ? "bg-brand text-white border-brand" : "border-slate-300 text-slate-600 hover:border-brand/60"}`}>
              {f}</button>
          ))}
        </div>
        {kandidatMassal > 0 && (
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => setMassal(true)}>{T.tinjau.massal} ({kandidatMassal})</Button>
          </div>
        )}
      </Card>

      {massal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setMassal(false)}>
          <div role="dialog" aria-modal="true" className="bg-surface border border-slate-200 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-base text-slate-800">{kandidatMassal} {T.tinjau.massalTanya}</p>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setMassal(false)}>{T.umum.kembali}</Button>
              <Button size="sm" onClick={massalGo}>{T.tinjau.massalYa}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3" role="tablist" aria-label="Tinjau">
        {(["butir", "bob"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold min-h-11 ${tab === t ? "bg-[#0F1B3D] text-white" : "text-slate-600 hover:text-[#0F1B3D] hover:bg-slate-100"}`}>
            {t === "butir" ? T.tinjau.tabButir : T.tinjau.tabBob}</button>
        ))}
      </div>

      {tab === "butir" && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-600">{T.tinjau.risikoAtas}</p>
          {items.length === 0 && <Alert kind="warn">{T.tinjau.kosong}</Alert>}
          {err !== "" && <div role="alert"><Alert kind="error">{err}</Alert></div>}
          {nextRisk && (
            <p className="text-xs text-slate-600">{T.tinjau.butirBerikut}: <b>{nextRisk.id}</b> — {nextRisk.requirement.slice(0, 80)}</p>
          )}
          {shown.map((it) => {
            const dc = decisions[it.id];
            const form = dec[it.id];
            const sk = srcKlien(it);
            return (
              <article key={it.id} className={`bg-surface border rounded-2xl p-4 ${it.status === "berisiko" ? "border-red-500/50" : "border-slate-200"}`}>
                <div className="text-[0.72rem] uppercase tracking-wide text-slate-600">{it.kategori} · {it.id}</div>
                <p className="text-base text-slate-800 mt-1">{it.requirement || "(tanpa teks)"}</p>
                <div className="flex gap-2 flex-wrap mt-2 items-center">
                  <Badge ok={it.status === "sesuai"}>{STATUS_LABEL[it.status]}</Badge>
                  <span className="text-xs text-slate-600">{T.tinjau.keyakinan}: {it.keyakinan}</span>
                  {it.perlu_konfirmasi && <Badge ok={false}>{T.tinjau.perluKonfirmasi}</Badge>}
                  {dc
                    ? <span className="text-xs text-green-700">✓ {T.tinjau.sudahDiputus} ({dc.putusan})</span>
                    : <span className="text-xs text-slate-600">{T.tinjau.belumDiputus}</span>}
                </div>
                {it.alasan !== "" && <p className="text-sm text-slate-600 mt-1">{T.tinjau.alasan}: {it.alasan}</p>}
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {sk && <SourceButton s={sk} onOpen={(s, a) => setPanel({ s, anchor: a })} />}
                  {it.sumber_knowledge.map((k) => (
                    <SourceButton key={k} s={{ kind: "knowledge", kode: k }} onOpen={(s, a) => setPanel({ s, anchor: a })} />
                  ))}
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-sm font-semibold text-slate-700">{T.tinjau.putusanJudul}</p>
                  <div className="flex gap-1.5 flex-wrap mt-1.5" role="group" aria-label={T.tinjau.putusanJudul}>
                    {[[ "benar", T.tinjau.putusanBenar], ["ubah", T.tinjau.putusanUbah], ["tanya", T.tinjau.putusanTanya]].map(([v, label]) => (
                      <button key={v} onClick={() => startDec(it.id, v)} aria-pressed={form?.putusan === v}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold border-[1.5px] min-h-10 ${form?.putusan === v ? "border-brand text-brand bg-brand-light" : "border-slate-300 text-slate-600"}`}>
                        {label as string}</button>
                    ))}
                  </div>
                  {form && (
                    <div className="mt-2 space-y-2">
                      {form.putusan === "ubah" && (
                        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Status baru">
                          {(["sesuai", "sebagian", "berisiko"] as const).map((s) => (
                            <button key={s} onClick={() => setDec((m) => ({ ...m, [it.id]: { ...m[it.id], status: s } }))}
                              aria-pressed={form.status === s}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold border min-h-9 ${form.status === s ? "border-brand text-brand" : "border-slate-300 text-slate-600"}`}>
                              {STATUS_LABEL[s]}</button>
                          ))}
                        </div>
                      )}
                      {(form.putusan === "ubah" || form.putusan === "tanya") && (
                        <input aria-label={form.putusan === "ubah" ? T.tinjau.putusanAlasan : T.tinjau.putusanTanyaKet}
                          placeholder={form.putusan === "ubah" ? T.tinjau.putusanAlasan : T.tinjau.putusanTanyaKet}
                          value={form.putusan === "ubah" ? form.alasan : form.pertanyaan}
                          onChange={(e) => setDec((m) => ({ ...m, [it.id]: { ...m[it.id], [form.putusan === "ubah" ? "alasan" : "pertanyaan"]: e.target.value } }))}
                          className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-base bg-white text-ink placeholder:text-slate-500" />
                      )}
                      <input aria-label={T.tinjau.putusanCatatan} placeholder={T.tinjau.putusanCatatan}
                        value={form.catatan}
                        onChange={(e) => setDec((m) => ({ ...m, [it.id]: { ...m[it.id], catatan: e.target.value } }))}
                        className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-base bg-white text-ink placeholder:text-slate-500" />
                      <Button size="sm" disabled={busy === it.id} onClick={() => simpan(it.id)}>
                        {busy === it.id ? T.umum.memuat : T.tinjau.putusanSimpan}</Button>
                    </div>
                  )}
                  {dc && dc.alasan !== "" && <p className="text-xs text-slate-600 mt-1.5">Alasan: {dc.alasan}{dc.catatan !== "" ? ` · Catatan: ${dc.catatan}` : ""}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {tab === "bob" && <div className="mt-3">{agent}</div>}

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <Button onClick={goHarga} disabled={sisa > 0} aria-describedby="alasan-harga">{T.tinjau.lanjut}</Button>
        {sisa > 0 && <span id="alasan-harga" className="text-xs text-slate-600">{sisa}{T.tinjau.sisaRisiko}</span>}
      </div>
      {panel && (
        <SourcePanel proposalId={p.id} s={panel.s} returnTo={panel.anchor} onClose={() => setPanel(null)} />
      )}
    </div>
  );
}
