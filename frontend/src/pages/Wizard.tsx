import { AlertTriangle, OctagonX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Input, Label, Select, Term, Textarea } from "../components/ui/controls";
import { api, authHeaders, fmtRp } from "../lib/utils";

type Catalog = {
  industries: string[];
  discount_max: number;
  website: { packages: { id: string; name: string; price_idr: number; timeline_weeks: number; best_for: string }[]; features: string[] };
  tender: { komponen: { kode: string; nama: string; satuan: string; harga_dasar: number }[] };
};

type Check = { name: string; ok: boolean };
type Result = {
  markdown: string;
  compliance: { score: number; passed: boolean; checks: Check[] };
  meta: { package: string; total: number; duration_weeks: number; mode: string };
  korporat: { kak: { kebutuhan: string; cocok: boolean }[]; uncovered: string[]; missing_legal: string[]; gate: { passed: boolean; blocks: string[] }; pagu: number };
};

const GLOS: [string, string][] = [
  ["Pagu", "Batas tertinggi belanja panitia. Total di atasnya = gate BLOKIR."],
  ["KAK", "Kerangka Acuan Kerja: tiap baris kebutuhan harus cocok 1 komponen."],
  ["RAB", "Rincian Anggaran Belanja: komponen × qty × harga satuan."],
  ["NIB/NPWP/Akta", "Legalitas wajib tender; kosong = gate BLOKIR."],
];

export default function Wizard() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("tender");
  const [nama, setNama] = useState("");
  const [ind, setInd] = useState("Pemerintahan");
  const [pagu, setPagu] = useState(0);
  const [dur, setDur] = useState(12);
  const [paket, setPaket] = useState("standard");
  const [disk, setDisk] = useState(0);
  const [fitur, setFitur] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [dok, setDok] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [legal, setLegal] = useState({ nib: "", npwp: "", akta: "" });
  const [catatan, setCatatan] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    api<Catalog>("/api/catalog").then((c) => { setCat(c); setInd("Pemerintahan"); }).catch(() => setErr("Gagal memuat katalog."));
  }, []);

  const price = useCallback((k: string) => cat?.tender.komponen.find((x) => x.kode === k)?.harga_dasar ?? 0, [cat]);
  const picked = useMemo(() => Object.entries(qty).filter(([, v]) => v > 0), [qty]);
  const total = useMemo(() => {
    if (!cat) return 0;
    if (mode === "website") {
      const p = cat.website.packages.find((x) => x.id === paket);
      return p ? Math.round(p.price_idr * (100 - Math.min(disk, cat.discount_max)) / 100) : 0;
    }
    return picked.reduce((a, [k, v]) => a + price(k) * v, 0);
  }, [cat, mode, paket, disk, picked, price]);
  const kakLines = useMemo(() => dok.split(/[\n;,]+/).map((s) => s.trim()).filter((s) => s.length >= 8).length, [dok]);

  function fillDemo() {
    setMode("tender"); setNama("Dinas Pelayanan Publik Kota Arunika"); setInd("Pemerintahan");
    setPagu(20000000); setDur(12);
    setLegal({ nib: "8120101234567", npwp: "01.234.567.8-901.000", akta: "No. 12/2021 Notaris Arunika" });
    setDok("Pengembangan backend API\nPengujian aplikasi\nPelatihan pengguna");
    setQty({ "DEV-BE": 10, QA: 5, TRAIN: 2 });
    setErr(""); setStep(2);
  }

  async function readFile(f: File | null): Promise<[string, string]> {
    if (!f) return ["", ""];
    if (f.size > 200 * 1024) throw new Error("Dokumen KAK maks 200KB.");
    const buf = await f.arrayBuffer();
    return [new TextDecoder("utf-8").decode(buf.slice(0, 200 * 1024)), f.name.slice(0, 80)];
  }

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const [dokText, dokNama] = file ? await readFile(file) : [dok, ""];
      const body: Record<string, unknown> = {
        mode, nama: nama.trim(), industri: ind, durasi_minggu: dur,
        diskon_persen: mode === "tender" ? 0 : disk, pagu,
        dokumen_text: dokText, dokumen_nama: dokNama, catatan: catatan.trim(),
        legal,
      };
      if (body.nama === "" || (body.nama as string).length < 2) { setErr("Nama instansi minimal 2 karakter."); setStep(1); return; }
      if (mode === "tender") {
        const ks = picked.map(([kode, qv]) => ({ kode, qty: qv }));
        if (!ks.length) { setErr("Isi qty minimal 1 komponen."); setStep(2); return; }
        body.komponen = ks;
      } else {
        if (!fitur.length) { setErr("Pilih minimal 1 fitur."); return; }
        body.paket = paket; body.fitur = fitur;
      }
      const j = await api<Result>("/api/draft", {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body),
      });
      setRes(j);
      try {
        const h = JSON.parse(localStorage.getItem("bm-hist") ?? "[]");
        localStorage.setItem("bm-hist", JSON.stringify([{ t: Date.now(), nama: body.nama, total: j.meta.total, score: j.compliance.score, md: j.markdown }, ...h].slice(0, 20)));
      } catch {}
      setStep(4);
      document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      if (e instanceof Error && (e as { status?: number }).status === 401) location.href = "/login";
      else setErr(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function exportDocx(kind: "md" | "docx") {
    if (!res) return setErr("Buat draft dulu.");
    if (kind === "md") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([res.markdown], { type: "text/markdown" }));
      a.download = "draft-proposal.md"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return;
    }
    const r = await fetch("/api/export", {
      method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ format: "docx", markdown: res.markdown }),
    });
    if (!r.ok) return setErr("Export gagal.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob()); a.download = "draft-proposal.docx"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  const steps = ["Instansi & pagu", "Komponen harga", "KAK + legalitas", "Hasil & gate"];
  const komps = (cat?.tender.komponen ?? []).filter((k) =>
    q === "" || (k.kode + " " + k.nama).toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="max-w-4xl mx-auto px-4 pb-24">
      <ol className="flex gap-1.5 my-4 list-none p-0">
        {steps.map((s, i) => (
          <li key={s} className="flex-1 min-w-0">
            <button onClick={() => setStep(i + 1)}
              aria-current={step === i + 1 ? "step" : undefined}
              className={`w-full text-left bg-white border-[1.5px] rounded-[10px] px-2.5 py-2 text-xs leading-snug ${step === i + 1 ? "border-brand bg-brand-light" : "border-slate-200"}`}>
              <b className="block text-[0.72rem] text-slate-500 font-semibold">Langkah {i + 1}</b>{s}
            </button>
          </li>
        ))}
      </ol>
      <details className="border border-slate-200 rounded-[10px] px-4 py-2.5 bg-slate-50 mb-4">
        <summary className="cursor-pointer font-semibold text-sm">Kamus istilah</summary>
        <dl className="grid sm:grid-cols-2 gap-x-5 mt-2">
          {GLOS.map(([t, d]) => (<div key={t}><dt className="font-bold text-sm">{t}</dt><dd className="text-sm text-slate-500 mb-1.5">{d}</dd></div>))}
        </dl>
      </details>

      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
        <label htmlFor="mode" className="text-sm m-0">Mode katalog</label>
        <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="w-auto min-w-60">
          <option value="tender">Tender (per-komponen) — default</option>
          <option value="website">Website (paket fix) — demo</option>
        </Select>
      </div>

      {step === 1 && (
        <Card>
          <h2 className="font-bold text-lg">Langkah 1 — Instansi &amp; pagu</h2>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <div><Label htmlFor="nama">Nama instansi *</Label>
              <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Dinas Pelayanan Publik Kota Arunika" /></div>
            <div><Label htmlFor="ind">Sektor *</Label>
              <Select id="ind" value={ind} onChange={(e) => setInd(e.target.value)}>
                {cat?.industries.map((i) => <option key={i}>{i}</option>)}
              </Select></div>
            <div><Label htmlFor="pagu"><Term tip="Batas tertinggi belanja panitia. 0 = tanpa pagu.">Pagu</Term> (Rp)</Label>
              <Input id="pagu" type="number" min={0} max={10000000000} step={100000} value={pagu}
                onChange={(e) => setPagu(parseInt(e.target.value || "0", 10))} />
              <p className="text-xs text-slate-500 mt-1">cth 20000000 = Rp 20 jt</p></div>
            <div><Label htmlFor="dur">Durasi (minggu) *</Label>
              <Input id="dur" type="number" min={1} max={12} value={dur}
                onChange={(e) => setDur(parseInt(e.target.value || "12", 10))} /></div>
          </div>
          <p className="text-sm text-slate-500 mt-3">Contoh cepat: <Button variant="secondary" size="sm" onClick={fillDemo}>Isi contoh tender</Button></p>
          <div className="mt-4"><Button onClick={() => setStep(2)}>Lanjut →</Button></div>
        </Card>
      )}

      {step === 2 && mode === "tender" && (
        <Card>
          <h2 className="font-bold text-lg">Langkah 2 — Komponen harga</h2>
          <p className="text-sm text-slate-500">Harga satuan terkunci katalog. Cari + isi qty.</p>
          <Input placeholder="Cari kode/nama…" value={q} onChange={(e) => setQ(e.target.value)} className="mt-2" />
          <div className="overflow-x-auto border border-slate-200 rounded-lg mt-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="text-left text-xs uppercase text-slate-500 bg-slate-50">
                <th className="px-3 py-2">Kode</th><th className="px-3 py-2">Komponen</th><th className="px-3 py-2">Harga</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Subtotal</th>
              </tr></thead>
              <tbody>
                {komps.map((k) => (
                  <tr key={k.kode} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{k.kode}</td>
                    <td className="px-3 py-2">{k.nama}<span className="text-slate-400 text-xs"> / {k.satuan}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtRp(k.harga_dasar)}</td>
                    <td className="px-3 py-2"><Input type="number" min={0} max={1000} className="max-w-24 py-1.5"
                      value={qty[k.kode] ?? 0} aria-label={"Qty " + k.kode}
                      onChange={(e) => setQty({ ...qty, [k.kode]: Math.max(0, parseInt(e.target.value || "0", 10)) })} /></td>
                    <td className="px-3 py-2 whitespace-nowrap">{(qty[k.kode] ?? 0) > 0 ? fmtRp(price(k.kode) * (qty[k.kode] ?? 0)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => setStep(1)}>← Kembali</Button><Button onClick={() => setStep(3)}>Lanjut →</Button></div>
        </Card>
      )}

      {step === 2 && mode === "website" && (
        <Card>
          <h2 className="font-bold text-lg">Langkah 2 — Paket website (demo)</h2>
          <Label htmlFor="paket">Paket *</Label>
          <Select id="paket" value={paket} onChange={(e) => { setPaket(e.target.value); const p = cat?.website.packages.find((x) => x.id === e.target.value); if (p) setDur(p.timeline_weeks); }}>
            {cat?.website.packages.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtRp(p.price_idr)} / {p.timeline_weeks} mgg</option>)}
          </Select>
          <Label htmlFor="disk">Diskon % (maks {cat?.discount_max ?? 10})</Label>
          <Input id="disk" type="number" min={0} max={cat?.discount_max ?? 10} step={0.5} value={disk}
            onChange={(e) => setDisk(parseFloat(e.target.value || "0"))} className="max-w-44" />
          <Label>Fitur (min 1)</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {cat?.website.features.map((f) => (
              <button key={f} onClick={() => setFitur(fitur.includes(f) ? fitur.filter((x) => x !== f) : [...fitur, f])}
                aria-pressed={fitur.includes(f)}
                className={`border-[1.5px] rounded-full px-3.5 py-2 text-sm min-h-10 ${fitur.includes(f) ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300"}`}>{f}</button>
            ))}
          </div>
          <div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => setStep(1)}>← Kembali</Button><Button onClick={() => setStep(3)}>Lanjut →</Button></div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2 className="font-bold text-lg">Langkah 3 — <Term tip="Kerangka Acuan Kerja dari panitia. Satu kebutuhan per baris.">KAK</Term> + legalitas</h2>
          <Label htmlFor="file">Upload KAK (maks 200KB)</Label>
          <Input id="file" type="file" accept=".txt,.md,.csv,.json,.pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Label htmlFor="dok">atau tempel teks KAK</Label>
          <Textarea id="dok" rows={4} value={dok} onChange={(e) => setDok(e.target.value)}
            placeholder={"Contoh per baris:\nPengembangan backend API\nPengujian aplikasi"} />
          <p className="text-xs text-slate-500 mt-1">{kakLines ? `${kakLines} baris KAK — tiap baris harus cocok 1 komponen.` : "Belum ada baris KAK."}</p>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <div><Label htmlFor="nib"><Term tip="Nomor Induk Berusaha dari OSS.">NIB</Term> *</Label>
              <Input id="nib" value={legal.nib} onChange={(e) => setLegal({ ...legal, nib: e.target.value })} placeholder="8120101234567" /></div>
            <div><Label htmlFor="npwp"><Term tip="Nomor Pokok Wajib Pajak.">NPWP</Term> *</Label>
              <Input id="npwp" value={legal.npwp} onChange={(e) => setLegal({ ...legal, npwp: e.target.value })} placeholder="01.234.567.8-901.000" /></div>
          </div>
          <Label htmlFor="akta"><Term tip="Dokumen notaris pendirian.">Akta pendirian</Term> *</Label>
          <Input id="akta" value={legal.akta} onChange={(e) => setLegal({ ...legal, akta: e.target.value })} placeholder="No. 12/2021 Notaris …" />
          <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold">Catatan internal (opsional)</summary>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} placeholder="Diskusi pagu, strategi harga…" className="mt-1" />
          </details>
          {err !== "" && <div className="mt-3"><Alert kind="error">{err}</Alert></div>}
          <div className="sticky bottom-3 bg-slate-900 text-white rounded-xl px-4 py-2.5 flex gap-4 flex-wrap text-sm mt-4">
            <span>Total <b>{fmtRp(total)}</b></span>
            <span>Pagu <b>{pagu ? fmtRp(pagu) : "tanpa pagu"}</b></span>
            <span className={`flex items-center gap-1.5 ${pagu && total > pagu ? "text-red-300 font-bold" : ""}`}>
              {mode === "tender" && picked.length === 0 ? "Isi qty minimal 1 komponen" : pagu && total > pagu ? <><AlertTriangle size={15} aria-hidden /> LEWAT pagu — gate BLOKIR</> : "Aman dari pagu"}</span>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setStep(2)}>← Kembali</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Menyusun…" : "Buat draft proposal"}</Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <h2 className="font-bold text-lg" id="hasil">Langkah 4 — Hasil &amp; gate korporat</h2>
          {err !== "" && <div className="my-2"><Alert kind="error">{err}</Alert></div>}
          {!res && <p className="text-sm text-slate-500">Belum ada draft. Selesaikan langkah 1–3 lalu buat draft.</p>}
          {res && <>
            <p><Badge ok={res.compliance.passed && res.korporat.gate.passed}>
              Compliance {res.compliance.score.toFixed(0)}% — {res.korporat.gate.passed ? (res.compliance.passed ? "LOLOS" : "ADA PELANGGARAN") : "BLOKIR GATE"}
            </Badge> <span className="text-sm text-slate-500">{res.meta.package} · {fmtRp(res.meta.total)} · {res.meta.duration_weeks} minggu</span></p>
            <div className="flex gap-2 flex-wrap my-2">
              {res.compliance.checks.map((c) => <Badge key={c.name} ok={c.ok}>{c.name}</Badge>)}
            </div>
            <div className={`border-[1.5px] border-dashed rounded-[10px] p-3 mt-2 ${res.korporat.gate.passed ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"}`}>
              <p className={`font-bold flex items-center gap-1.5 ${res.korporat.gate.passed ? "text-green-700" : "text-red-700"}`}>
                {res.korporat.gate.passed ? "Gate: LOLOS ✓" : <><OctagonX size={16} aria-hidden /> Gate: BLOKIR</>}</p>
              {res.korporat.gate.blocks.map((b) => <div key={b} className="text-red-700 text-sm flex items-start gap-1.5"><OctagonX size={14} className="mt-0.5 shrink-0" aria-hidden /> {b}</div>)}
              {res.korporat.uncovered.slice(0, 5).map((u: string) => <div key={u} className="text-sm">• KAK tak terpetakan: {u.slice(0, 120)}</div>)}
            </div>
            <pre className="whitespace-pre-wrap bg-slate-900 text-slate-100 p-4 rounded-[10px] overflow-auto max-h-[60vh] text-[0.83rem] font-mono mt-3">{res.markdown}</pre>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => exportDocx("md")}>Export .md</Button>
              <Button variant="secondary" onClick={() => exportDocx("docx")}>Export .docx</Button>
              <Button variant="secondary" onClick={() => window.print()}>Print / PDF</Button>
            </div>
          </>}
        </Card>
      )}
    </main>
  );
}
