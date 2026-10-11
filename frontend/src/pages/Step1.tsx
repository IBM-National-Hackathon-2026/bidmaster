import { ArrowRight, FileUp, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Label, Select } from "../components/ui/controls";
import { ProposalApi, type Proposal } from "../lib/proposals";
import { CONTOH_REQUIREMENT, T } from "../ui-text";

const JENIS = ["Pemerintahan", "BUMN/BUMD", "Swasta", "Pendidikan", "Kesehatan", "Lainnya"];

export default function Step1({ p, setP, autosave, reload }: {
  p: Proposal;
  setP: (p: Proposal) => void;
  autosave: (patch: object) => void;
  reload: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [company, setCompany] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sup, setSup] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ProposalApi.company().then((c) => setCompany(`${c.nama_resmi} — ${c.tagline}`)).catch(() => setCompany(""));
  }, []);

  function rpFormat(v: number | null): string {
    if (v === null) return "";
    return "Rp " + v.toLocaleString("id-ID");
  }
  function rpParse(s: string): number | null {
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return Number.isNaN(n) ? null : n;
  }

  async function doUpload(f: File, kind: string) {
    setErr("");
    try {
      const j = await ProposalApi.upload(p.id, f, kind);
      setP(j.proposal);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.unggah.unggahGagal);
    }
  }

  async function useContoh() {
    setErr("");
    try {
      const j = await ProposalApi.upload(p.id,
        new File([CONTOH_REQUIREMENT], "requirement-contoh.txt", { type: "text/plain" }), "requirement");
      setP(j.proposal);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.unggah.unggahGagal);
    }
  }

  async function analyze() {
    setErr("");
    setBusy(true);
    setStage(0);
    const tick = setInterval(() => setStage((s) => (s < 3 ? s + 1 : s)), 20000);
    try {
      const j = await ProposalApi.analyze(p.id);
      setP(j.proposal);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.unggah.unggahGagal);
    } finally {
      clearInterval(tick);
      setBusy(false);
      setStage(-1);
    }
  }

  return (
    <div className="anim-fade-up">
      <Card>
        <h2 className="font-bold text-lg text-white">{T.unggah.judul}</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); doUpload(f, "requirement"); } }}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0} aria-label={T.unggah.zona}
          onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.click(); }}
          className={`mt-3 border-[1.5px] border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors min-h-44 flex flex-col items-center justify-center gap-2 ${drag ? "border-brand bg-brand-light" : "border-white/15 bg-white/5 hover:border-brand/60"}`}>
          <FileUp size={28} className="text-brand" aria-hidden />
          <span className="font-semibold text-slate-100">{T.unggah.zona}</span>
          <span className="text-xs text-slate-400">{T.unggah.format}</span>
          <input ref={inputRef} type="file" hidden accept=".txt,.md,.csv,.json,.pdf,.docx"
            onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) doUpload(f, "requirement"); }} />
        </div>
        {(p.req_nama !== "" || file) && (
          <div className="mt-2 text-sm text-slate-200" role="status">
            <b>{p.req_nama || file?.name}</b>
            {p.req_jumlah > 0 && <span> · {p.req_jumlah} {p.req_satuan} · {T.unggah.berhasil}</span>}
            <button onClick={() => inputRef.current?.click()} className="ml-3 text-brand text-sm font-semibold underline">{T.unggah.ganti}</button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-x-4 mt-2">
          <div>
            <Label htmlFor="instansi">Nama instansi</Label>
            <Input id="instansi" value={p.instansi} maxLength={80}
              onChange={(e) => { setP({ ...p, instansi: e.target.value }); autosave({ instansi: e.target.value }); }} />
          </div>
          <div>
            <Label htmlFor="jenis">Jenis instansi</Label>
            <Select id="jenis" value={p.jenis_instansi}
              onChange={(e) => { setP({ ...p, jenis_instansi: e.target.value }); autosave({ jenis_instansi: e.target.value }); }}>
              {JENIS.map((j) => <option key={j}>{j}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="pagu">Pagu (opsional)</Label>
            <Input id="pagu" inputMode="numeric" value={rpFormat(p.pagu)}
              placeholder="cth Rp 20.000.000"
              onChange={(e) => { const v = rpParse(e.target.value); setP({ ...p, pagu: v }); autosave({ pagu: v }); }} />
            <p className="text-xs text-slate-400 mt-1">{T.unggah.paguHint}</p>
          </div>
          <div>
            <Label htmlFor="durasi">Durasi pengerjaan (minggu)</Label>
            <Input id="durasi" type="number" min={1} max={52} value={p.durasi_minggu}
              onChange={(e) => { const v = Math.max(1, Math.min(52, parseInt(e.target.value || "12", 10))); setP({ ...p, durasi_minggu: v }); autosave({ durasi_minggu: v }); }} />
          </div>
        </div>

        <div className="mt-4 border border-white/10 rounded-xl p-4">
          <h3 className="font-semibold text-sm text-slate-200">{T.unggah.pendukungJudul}</h3>
          <p className="text-xs text-slate-400">{T.unggah.pendukungKet}</p>
          {p.pendukung.map((d) => (
            <div key={d.nama} className="text-sm text-slate-200 mt-1">• {d.nama} · {d.jumlah} {d.satuan}</div>
          ))}
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => supRef.current?.click()}>{T.unggah.tambahPendukung}</Button>
            <input ref={supRef} type="file" hidden accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; setSup(f); if (f) doUpload(f, "pendukung"); }} />
            {sup && <span className="text-xs text-slate-400 self-center">{sup.name}</span>}
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-400 border border-white/10 rounded-lg px-3 py-2">
          {company !== "" ? company + ". " : ""}{T.unggah.perusahaanBox}{" "}
          <button onClick={useContoh} className="text-brand font-semibold underline">{T.unggah.contoh}</button>
        </div>

        {err !== "" && <div className="mt-3" role="alert"><Alert kind="error">{err}</Alert></div>}

        <div className="mt-4">
          <Button onClick={analyze} disabled={busy || p.req_teks.trim() === ""} aria-describedby="alasan-analisis">
            {busy ? "Menganalisis…" : T.unggah.analisis} <ArrowRight size={15} aria-hidden />
          </Button>
          {(p.req_teks.trim() === "" || busy) && (
            <p id="alasan-analisis" className="text-xs text-slate-400 mt-1">
              {p.req_teks.trim() === "" ? T.unggah.perluFile : ""}
            </p>
          )}
          {busy && (
            <ol className="mt-3 space-y-1.5" aria-live="polite">
              {T.unggah.tahap.map((t, i) => (
                <li key={t} className={`text-sm flex items-center gap-2 ${i < stage ? "text-green-300" : i === stage ? "text-white font-semibold" : "text-slate-500"}`}>
                  <span className={`w-2 h-2 rounded-full ${i < stage ? "bg-green-400" : i === stage ? "bg-brand animate-pulse" : "bg-slate-600"}`} />
                  {t}{i === stage ? "…" : i < stage ? " ✓" : ""}
                </li>
              ))}
              <li className="text-xs text-slate-500">{T.unggah.estimasi}</li>
            </ol>
          )}
        </div>
      </Card>
      <div className="mt-3 text-right">
        <Button variant="secondary" onClick={() => reload()}><RefreshCw size={15} aria-hidden /> Muat ulang</Button>
      </div>
    </div>
  );
}
