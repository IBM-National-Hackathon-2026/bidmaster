import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Input, Label, Select } from "../components/ui/controls";
import type { Proposal } from "../lib/proposals";
import { T } from "../ui-text";
import { api, authHeaders, fmtRp } from "../lib/utils";

type Row = {
  kode: string; nama: string; satuan: string; qty: number;
  harga_acuan: number; harga_proposal: number; alasan: string; alasan_catatan: string;
  subtotal?: number; deviasi?: number; lencana?: string;
};
type Ringkas = {
  rows: Row[]; subtotal: number; diskon_rp: number; total: number;
  perlu_persetujuan: boolean; sebab: string[]; pagu_ok: boolean | null;
};

const ALASAN = ["kontrak lanjutan", "volume besar", "tingkat kesulitan", "negosiasi klien", "lainnya"];

export default function Step3({ p, setP, refresh, goStep }: {
  p: Proposal; setP: (p: Proposal) => void; refresh: () => void; goStep: (n: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [ring, setRing] = useState<Ringkas | null>(null);
  const [tipe, setTipe] = useState("persen");
  const [nilai, setNilai] = useState(0);
  const [alasanD, setAlasanD] = useState("");
  const [oleh, setOleh] = useState("");
  const [centang, setCentang] = useState(false);
  const [kat, setKat] = useState<{ kode: string; nama: string; satuan: string; harga_dasar: number }[]>([]);
  const [cari, setCari] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("");
  const [legal, setLegal] = useState({ nib: "", npwp: "", akta: "" });
  const [kurang, setKurang] = useState<string[]>([]);
  const [preview, setPreview] = useState("");
  const [lampS, setLampS] = useState(true);
  const [lampK, setLampK] = useState(true);
  const [sukses, setSukses] = useState("");
  const [versions, setVersions] = useState<{ versi: number; pada?: string }[]>([]);

  useEffect(() => {
    api<{ tender: { komponen: { kode: string; nama: string; satuan: string; harga_dasar: number }[] } }>("/api/catalog")
      .then((c) => setKat(c.tender.komponen)).catch(() => setErr(T.umum.cobaLagi));
    api<{ nama: string; peran: string }>("/api/me").then((u) => setRole(u.peran)).catch(() => {});
    api<{ legalitas: { nib: string; npwp: string; akta: string } }>("/api/company")
      .then((c) => setLegal(c.legalitas)).catch(() => {});
    api<{ ringkasan: Ringkas; proposal: Proposal }>(`/api/proposals/${p.id}/prices`, { headers: authHeaders() })
      .then((j) => {
        setRows(j.ringkasan.rows); setRing(j.ringkasan); setP(j.proposal);
        const d = (j.proposal as unknown as { discount?: { tipe: string; nilai: number; alasan: string } }).discount;
        if (d) { setTipe(d.tipe); setNilai(d.nilai); setAlasanD(d.alasan); }
      }).catch((e) => setErr(e instanceof Error ? e.message : T.umum.cobaLagi));
    api<{ ok: boolean; kurang: string[] }>(`/api/proposals/${p.id}/download-check`, { headers: authHeaders() })
      .then((j) => setKurang(j.ok ? [] : j.kurang)).catch(() => {});
    api<{ versions: { versi: number; pada?: string }[] }>(`/api/proposals/${p.id}/versions`, { headers: authHeaders() })
      .then((j) => setVersions(j.versions)).catch(() => {});
  }, [p.id]);

  function rpParse(s: string): number {
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return Number.isNaN(n) ? 0 : n;
  }

  async function simpan() {
    setErr("");
    setBusy(true);
    try {
      const j = await api<{ proposal: Proposal; ringkasan: Ringkas }>(`/api/proposals/${p.id}/prices`, {
        method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          rows: rows.map((r) => ({ kode: r.kode, qty: r.qty, harga_proposal: r.harga_proposal, alasan: r.alasan, alasan_catatan: r.alasan_catatan })),
          diskon: { tipe, nilai, alasan: alasanD },
        }),
      });
      setP(j.proposal);
      setRing(j.ringkasan);
      setRows(j.ringkasan.rows);
      const c = await api<{ ok: boolean; kurang: string[] }>(`/api/proposals/${p.id}/download-check`, { headers: authHeaders() });
      setKurang(c.ok ? [] : c.kurang);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    } finally {
      setBusy(false);
    }
  }

  function tambah(kode: string) {
    const k = kat.find((x) => x.kode === kode);
    if (!k || rows.some((r) => r.kode === kode)) return;
    setRows([...rows, { kode: k.kode, nama: k.nama, satuan: k.satuan, qty: 1, harga_acuan: k.harga_dasar, harga_proposal: k.harga_dasar, alasan: "", alasan_catatan: "" }]);
  }

  async function lihatPreview() {
    setErr("");
    try {
      const j = await api<{ markdown: string }>(`/api/proposals/${p.id}/preview`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ lampiran_sumber: lampS, lampiran_klarifikasi: lampK }),
      });
      setPreview(j.markdown);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }

  async function unduh(format: "docx" | "md") {
    setErr("");
    try {
      const r = await fetch(`/api/proposals/${p.id}/export`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ format, lampiran_sumber: lampS, lampiran_klarifikasi: lampK }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setKurang(j.kurang ?? []);
        throw new Error(j.error ?? T.umum.cobaLagi);
      }
      const nama = (r.headers.get("Content-Disposition") ?? "").match(/filename="(.+?)"/)?.[1] ?? `proposal.${format}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await r.blob());
      a.download = nama;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setSukses(nama);
      refresh();
      api<{ versions: { versi: number; pada?: string }[] }>(`/api/proposals/${p.id}/versions`, { headers: authHeaders() })
        .then((j) => setVersions(j.versions)).catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }

  async function unduhVersi(v: number, format: "docx" | "md") {
    const r = await fetch(`/api/proposals/${p.id}/versions/${v}/file?format=${format}`, { headers: authHeaders() });
    if (!r.ok) return setErr(T.umum.cobaLagi);
    const nama = (r.headers.get("Content-Disposition") ?? "").match(/filename="(.+?)"/)?.[1] ?? `proposal-v${v}.${format}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = nama;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  const approvals = (p as unknown as { approvals?: { oleh: string }[] }).approvals ?? [];
  const syarat: { ok: boolean; aksi?: () => void }[] = [
    { ok: true },
    { ok: ring?.pagu_ok ?? true, aksi: () => goStep(1) },
    { ok: legal.nib !== "" && legal.npwp !== "" && legal.akta !== "" },
    { ok: !ring?.perlu_persetujuan || approvals.length > 0 },
  ];

  return (
    <div className="anim-fade-up grid lg:grid-cols-[1fr_300px] gap-4">
      <div>
        <Card>
          <h2 className="font-bold text-lg text-white">{T.harga.judul}</h2>
          <div className="flex gap-2 mt-2">
            <Input placeholder={T.harga.cari} value={cari} onChange={(e) => setCari(e.target.value)} aria-label={T.harga.tambah} />
          </div>
          {cari !== "" && (
            <div className="mt-1 border border-white/10 rounded-lg max-h-40 overflow-y-auto">
              {kat.filter((k) => (k.kode + " " + k.nama).toLowerCase().includes(cari.toLowerCase())).slice(0, 8).map((k) => (
                <button key={k.kode} onClick={() => { tambah(k.kode); setCari(""); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 min-h-11">
                  {k.kode} — {k.nama} <span className="text-slate-500">({fmtRp(k.harga_dasar)})</span></button>
              ))}
            </div>
          )}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-2 pr-2">{T.harga.kolomKomponen}</th>
                <th className="py-2 pr-2">{T.harga.kolomQty}</th>
                <th className="py-2 pr-2">{T.harga.kolomAcuan}</th>
                <th className="py-2 pr-2">{T.harga.kolomProposal}</th>
                <th className="py-2">{T.harga.kolomSubtotal}</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.kode} className="border-t border-white/10 align-top">
                    <td className="py-2 pr-2 text-slate-200">{r.nama}<br /><span className="text-xs text-slate-500">{r.kode} / {r.satuan}</span>
                      {r.lencana !== "" && <><br /><span className="text-xs font-bold text-amber-300">{r.lencana}</span></>}
                    </td>
                    <td className="py-2 pr-2"><Input type="number" min={1} max={1000} className="max-w-24 py-1.5" aria-label={`Jumlah ${r.kode}`}
                      value={r.qty} onChange={(e) => { const n = [...rows]; n[i] = { ...r, qty: Math.max(1, parseInt(e.target.value || "1", 10)) }; setRows(n); }} /></td>
                    <td className="py-2 pr-2 text-slate-500 whitespace-nowrap">{fmtRp(r.harga_acuan)}</td>
                    <td className="py-2 pr-2">
                      <Input inputMode="numeric" aria-label={`Harga proposal ${r.kode}`} className="max-w-36 py-1.5"
                        value={fmtRp(r.harga_proposal)}
                        onChange={(e) => { const n = [...rows]; n[i] = { ...r, harga_proposal: rpParse(e.target.value) }; setRows(n); }} />
                      {r.harga_proposal !== r.harga_acuan && (
                        <div className="mt-1 space-y-1">
                          <Select aria-label={`${T.harga.alasan} ${r.kode}`} value={r.alasan}
                            onChange={(e) => { const n = [...rows]; n[i] = { ...r, alasan: e.target.value }; setRows(n); }}
                            className="py-1.5 text-xs">
                            <option value="">{T.harga.alasanPilih}</option>
                            {ALASAN.map((a) => <option key={a} value={a}>{a}</option>)}
                          </Select>
                          <Input aria-label={`${T.harga.catatan} ${r.kode}`} placeholder={T.harga.catatan}
                            value={r.alasan_catatan} onChange={(e) => { const n = [...rows]; n[i] = { ...r, alasan_catatan: e.target.value }; setRows(n); }}
                            className="py-1.5 text-xs" maxLength={200} />
                        </div>
                      )}
                    </td>
                    <td className="py-2 whitespace-nowrap text-slate-100">{fmtRp(r.harga_proposal * r.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card>
            <h3 className="font-bold text-white">{T.harga.diskonJudul}</h3>
            <div className="flex gap-2 mt-2">
              {(["persen", "nominal"] as const).map((t) => (
                <button key={t} onClick={() => setTipe(t)} aria-pressed={tipe === t}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold border min-h-10 ${tipe === t ? "border-brand text-brand" : "border-white/15 text-slate-400"}`}>
                  {t === "persen" ? T.harga.diskonPersen : T.harga.diskonNominal}</button>
              ))}
              <Input type="number" min={0} aria-label="Nilai diskon" value={nilai}
                onChange={(e) => setNilai(Math.max(0, parseInt(e.target.value || "0", 10)))} className="max-w-32 py-1.5" />
            </div>
            <Label htmlFor="diskon-alasan">{T.harga.diskonAlasan}</Label>
            <Input id="diskon-alasan" value={alasanD} onChange={(e) => setAlasanD(e.target.value)} maxLength={40} />
          </Card>
          {err !== "" && <div className="mt-2" role="alert"><Alert kind="error">{err}</Alert></div>}
          <div className="mt-3"><Button onClick={simpan} disabled={busy}>{busy ? T.harga.menyimpan : T.harga.simpan}</Button></div>
        </Card>

        <Card>
          <h3 className="font-bold text-white">{T.harga.legalJudul}</h3>
          {[["NIB", legal.nib], ["NPWP", legal.npwp], ["Akta", legal.akta]].map(([l, v]) => (
            <div key={l} className="text-sm mt-1 text-slate-200">{l}: {v !== "" ? v : <span className="text-slate-500">{T.harga.legalHubungi}</span>}</div>
          ))}
        </Card>

        <Card>
          <h3 className="font-bold text-white">{T.harga.pratinjau}</h3>
          <div className="flex gap-4 flex-wrap mt-2 text-sm text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={lampS} onChange={(e) => setLampS(e.target.checked)} className="w-5 h-5 accent-amber-500" />
              {T.harga.lampiranSumber}</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={lampK} onChange={(e) => setLampK(e.target.checked)} className="w-5 h-5 accent-amber-500" />
              {T.harga.lampiranKlarifikasi}</label>
          </div>
          <div className="mt-2 flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={lihatPreview}>{T.harga.pratinjauLihat}</Button>
            <Button onClick={() => unduh("docx")} disabled={kurang.length > 0}>{T.harga.unduhDocx}</Button>
            <Button variant="secondary" onClick={() => unduh("md")} disabled={kurang.length > 0}>{T.harga.unduhMd}</Button>
            <Button variant="secondary" onClick={() => window.print()}>{T.harga.unduhCetak}</Button>
          </div>
          {kurang.length > 0 && <p className="text-xs text-amber-300 mt-1">Belum terpenuhi: {kurang.join("; ")}</p>}
          {sukses !== "" && (
            <div className="mt-3 border border-green-500/40 bg-green-500/10 rounded-xl p-4">
              <p className="font-bold text-green-300">{T.harga.sukses}: {sukses}</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => unduh("docx")}>{T.harga.suksesUlang}</Button>
                <Button size="sm" variant="secondary" onClick={() => nav0("/app")}>{T.harga.suksesBaru}</Button>
                <Button size="sm" variant="secondary" onClick={() => nav0("/riwayat")}>{T.harga.suksesRiwayat}</Button>
              </div>
            </div>
          )}
          {versions.length > 0 && (
            <div className="mt-3 text-sm text-slate-300">
              {T.harga.versi}: {versions.map((v) => (
                <span key={v.versi} className="mr-2">v{v.versi}
                  <button onClick={() => unduhVersi(v.versi, "docx")} className="text-brand underline ml-1">.docx</button>
                  <button onClick={() => unduhVersi(v.versi, "md")} className="text-brand underline ml-1">.md</button>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
      <aside className="space-y-3 lg:sticky lg:top-20 self-start">
        <Card>
          <div className="text-2xl font-extrabold text-white">{ring ? fmtRp(ring.total) : "…"}</div>
          <div className="text-xs text-slate-400 mt-1">
            {T.harga.subtotal}: {ring ? fmtRp(ring.subtotal) : "…"} · {T.harga.diskon}: {ring ? fmtRp(ring.diskon_rp) : "…"}
          </div>
          <div className="text-xs text-slate-400">
            Pagu: {p.pagu ? fmtRp(p.pagu) : T.harga.tanpaPagu}
            {ring && ring.pagu_ok !== null && (ring.pagu_ok ? ` · ${T.harga.paguDiBawah}` : ` · ${T.harga.paguLewat}`)}
          </div>
          <div className="mt-2">
            {ring && (ring.perlu_persetujuan && approvals.length === 0
              ? <Badge ok={false}>{T.harga.perluSetuju}</Badge>
              : <Badge ok={true}>{approvals.length > 0 ? `Disetujui ${approvals.length}x` : T.harga.siap}</Badge>)}
          </div>
          {ring?.sebab.map((s) => <div key={s} className="text-xs text-amber-300 mt-1">• {s}</div>)}
          <Label htmlFor="oleh">{T.harga.setujuOleh}</Label>
          <Input id="oleh" value={oleh} onChange={(e) => setOleh(e.target.value)} maxLength={80} />
          <label className="flex items-start gap-2 mt-2 text-sm text-slate-200 cursor-pointer">
            <input type="checkbox" checked={centang} onChange={(e) => setCentang(e.target.checked)} className="mt-1 w-5 h-5 accent-amber-500" />
            {T.harga.centang}
          </label>
          <div className="mt-2"><Button size="sm" onClick={setujui}>{T.harga.setujuOleh}</Button></div>
          {role !== "" && role !== "admin" && <p className="text-xs text-slate-500 mt-1">{T.harga.butuhApprover}</p>}
        </Card>
        <Card>
          <h3 className="font-bold text-sm text-white">{T.harga.syaratJudul}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {T.harga.syarat.map((s, i) => (
              <li key={s} className={`flex items-start gap-2 ${syarat[i].ok ? "text-green-300" : "text-slate-300"}`}>
                <span aria-hidden>{syarat[i].ok ? "✓" : "○"}</span>
                {syarat[i].aksi && !syarat[i].ok
                  ? <button onClick={syarat[i].aksi} className="underline text-left">{s}</button>
                  : <span>{s}</span>}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">{T.harga.estimasi}</p>
        </Card>
      </aside>
      {preview !== "" && <PreviewDoc md={preview} onClose={() => setPreview("")} />}
    </div>
  );

  function nav0(to: string) { window.location.href = to; }

  async function setujui() {
    setErr("");
    try {
      const j = await api<{ proposal: Proposal }>(`/api/proposals/${p.id}/approve`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ disetujui_oleh: oleh, centang }),
      });
      setP(j.proposal);
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }
}

function PreviewDoc({ md, onClose }: { md: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-white text-slate-900 max-w-3xl mx-auto rounded-lg my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-4 border-b no-print sticky top-0 bg-white rounded-t-lg">
          <h2 className="font-bold flex-1">{T.harga.pratinjau}</h2>
          <Button size="sm" variant="secondary" onClick={onClose}>{T.harga.kembaliPerbaiki}</Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()}>{T.harga.unduhCetak}</Button>
        </div>
        <div className="p-8 print-area text-[0.95rem] leading-relaxed" id="print-doc">
          {md.split("\n").map((l, i) => {
            if (l.startsWith("# ")) return <h1 key={i} className="text-2xl font-extrabold mt-4">{l.slice(2)}</h1>;
            if (l.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-4">{l.slice(3)}</h2>;
            if (l.startsWith("|")) return <p key={i} className="font-mono text-xs overflow-x-auto">{l}</p>;
            if (l.startsWith("- ")) return <li key={i} className="ml-5">{l.slice(2)}</li>;
            if (l.trim() === "" || l.trim() === "---") return <div key={i} className="h-2" />;
            return <p key={i} className="mt-1">{l}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
