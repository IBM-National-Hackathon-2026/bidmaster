import { ArrowRight, FileText, FileUp, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Label, Select } from "../components/ui/controls";
import { ProposalApi, type Proposal } from "../lib/proposals";
import { CONTOH_REQUIREMENT, T } from "../ui-text";

const JENIS = ["Pemerintahan", "BUMN/BUMD", "Swasta", "Pendidikan", "Kesehatan", "Lainnya"];

type Hapus = { kind: "requirement" | "pendukung"; index?: number; nama: string } | null;

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
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [supUploading, setSupUploading] = useState(false);
  const [supJust, setSupJust] = useState(false);
  const [hapus, setHapus] = useState<Hapus>(null);
  const [hapusBusy, setHapusBusy] = useState(false);
  const [pesan, setPesan] = useState("");
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

  async function doUpload(f: File, kind: "requirement" | "pendukung") {
    setErr("");
    setPesan("");
    if (kind === "requirement") { setUploading(true); setJustUploaded(false); }
    else { setSupUploading(true); setSupJust(false); }
    try {
      const j = await ProposalApi.upload(p.id, f, kind);
      setP(j.proposal);
      if (kind === "requirement") { setJustUploaded(true); setTimeout(() => setJustUploaded(false), 2600); }
      else { setSupJust(true); setTimeout(() => setSupJust(false), 2600); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.unggah.unggahGagal);
    } finally {
      if (kind === "requirement") setUploading(false);
      else setSupUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      if (supRef.current) supRef.current.value = "";
    }
  }

  async function useContoh() {
    setErr("");
    await doUpload(new File([CONTOH_REQUIREMENT], "requirement-contoh.txt", { type: "text/plain" }), "requirement");
  }

  async function konfirmasiHapus() {
    if (!hapus) return;
    setErr("");
    setHapusBusy(true);
    try {
      const j = await ProposalApi.deleteFile(p.id, hapus.kind, hapus.index);
      setP(j.proposal);
      setPesan(T.unggah.dihapus);
      setTimeout(() => setPesan(""), 2600);
      setHapus(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.unggah.cobaLagi);
    } finally {
      setHapusBusy(false);
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

  const adaReq = p.req_nama !== "" || p.req_teks.trim() !== "";

  return (
    <div className="anim-fade-up">
      <Card>
        <h2 className="font-bold text-lg text-[#0F1B3D]">{T.unggah.judul}</h2>

        {/* Zona unggah / kartu dokumen terunggah */}
        {!adaReq ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f, "requirement"); }}
            onClick={() => { if (!uploading) inputRef.current?.click(); }}
            role="button" tabIndex={0} aria-label={T.unggah.zona} aria-busy={uploading}
            onKeyDown={(e) => { if (e.key === "Enter" && !uploading) inputRef.current?.click(); }}
            className={`mt-3 border-[1.5px] border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors min-h-44 flex flex-col items-center justify-center gap-2 ${drag ? "border-brand bg-brand-light" : "border-slate-300 bg-slate-100 hover:border-brand/60"}`}>
            {uploading ? (
              <div className="w-full max-w-sm flex flex-col items-center gap-3" aria-live="polite">
                <UploadCloud size={28} className="text-brand animate-bounce" aria-hidden />
                <span className="font-semibold text-slate-800">{T.unggah.sedangUnggah}</span>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-full bg-brand progress-stripes" />
                </div>
              </div>
            ) : (
              <>
                <FileUp size={28} className="text-brand" aria-hidden />
                <span className="font-semibold text-slate-800">{T.unggah.zona}</span>
                <span className="text-xs text-slate-600">{T.unggah.format}</span>
              </>
            )}
            <input ref={inputRef} type="file" hidden accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) doUpload(f, "requirement"); }} />
          </div>
        ) : (
          <div className={`mt-3 border-[1.5px] rounded-2xl p-4 flex items-start gap-3 bg-green-50 border-green-300 ${justUploaded ? "anim-pop" : ""}`} role="status">
            <span className="relative shrink-0 w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center" aria-hidden>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path className="check-path" d="M4 12.5l5 5L20 6.5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.7rem] font-bold uppercase tracking-wide text-green-800">{T.unggah.terunggah}</span>
                {justUploaded && <span className="text-[0.7rem] font-semibold text-green-700 anim-slide-up">{T.unggah.berhasil}</span>}
              </div>
              <p className="text-base font-semibold text-[#0F1B3D] truncate mt-0.5 flex items-center gap-1.5">
                <FileText size={15} className="text-green-700 shrink-0" aria-hidden />{p.req_nama || "dokumen"}
              </p>
              {p.req_jumlah > 0 && <p className="text-xs text-slate-600 mt-0.5">{p.req_jumlah} {p.req_satuan} · {T.unggah.berhasil}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <RefreshCw size={14} aria-hidden /> {T.unggah.ganti}
              </Button>
              <Button size="sm" variant="secondary" className="text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => setHapus({ kind: "requirement", nama: p.req_nama || "dokumen" })} disabled={uploading}>
                <Trash2 size={14} aria-hidden /> {T.unggah.hapus}
              </Button>
            </div>
            <input ref={inputRef} type="file" hidden accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) doUpload(f, "requirement"); }} />
          </div>
        )}

        {pesan !== "" && <div className="mt-2 anim-slide-up" role="status"><Alert kind="ok">{pesan}</Alert></div>}

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
            <p className="text-xs text-slate-600 mt-1">{T.unggah.paguHint}</p>
          </div>
          <div>
            <Label htmlFor="durasi">Durasi pengerjaan (minggu)</Label>
            <Input id="durasi" type="number" min={1} max={52} value={p.durasi_minggu}
              onChange={(e) => { const v = Math.max(1, Math.min(52, parseInt(e.target.value || "12", 10))); setP({ ...p, durasi_minggu: v }); autosave({ durasi_minggu: v }); }} />
          </div>
        </div>

        <div className="mt-4 border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-sm text-slate-700">{T.unggah.pendukungJudul}</h3>
          <p className="text-xs text-slate-600">{T.unggah.pendukungKet}</p>
          {p.pendukung.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {p.pendukung.map((d, i) => (
                <li key={`${d.nama}-${i}`}
                  className={`flex items-center gap-2 text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 ${supJust && i === p.pendukung.length - 1 ? "anim-pop" : ""}`}>
                  <FileText size={15} className="text-brand shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{d.nama}</span>
                  <span className="text-xs text-slate-600 shrink-0 hidden sm:inline">{d.jumlah} {d.satuan}</span>
                  <button onClick={() => setHapus({ kind: "pendukung", index: i, nama: d.nama })}
                    aria-label={`${T.unggah.hapus} ${d.nama}`}
                    className="text-red-700 hover:bg-red-50 rounded-lg p-2.5 min-w-11 min-h-11 inline-flex items-center justify-center shrink-0">
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => supRef.current?.click()} disabled={supUploading}>
              {supUploading ? T.unggah.sedangUnggah : T.unggah.tambahPendukung}
            </Button>
            {supUploading && <span className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden"><span className="block h-full w-full bg-brand progress-stripes" /></span>}
            <input ref={supRef} type="file" hidden accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) doUpload(f, "pendukung"); }} />
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-2">
          {company !== "" ? company + ". " : ""}{T.unggah.perusahaanBox}{" "}
          <button onClick={useContoh} className="text-brand font-semibold underline inline-flex items-center min-h-11 px-1">{T.unggah.contoh}</button>
        </div>

        {err !== "" && <div className="mt-3" role="alert"><Alert kind="error">{err}</Alert></div>}

        <div className="mt-4">
          <Button onClick={analyze} disabled={busy || p.req_teks.trim() === ""} aria-describedby="alasan-analisis">
            {busy ? "Menganalisis…" : T.unggah.analisis} <ArrowRight size={15} aria-hidden />
          </Button>
          {(p.req_teks.trim() === "" || busy) && (
            <p id="alasan-analisis" className="text-xs text-slate-600 mt-1">
              {p.req_teks.trim() === "" ? T.unggah.perluFile : ""}
            </p>
          )}
          {busy && (
            <ol className="mt-3 space-y-1.5" aria-live="polite">
              {T.unggah.tahap.map((t, i) => (
                <li key={t} className={`text-sm flex items-center gap-2 ${i < stage ? "text-green-700" : i === stage ? "text-[#0F1B3D] font-semibold" : "text-slate-600"}`}>
                  <span className={`w-2 h-2 rounded-full ${i < stage ? "bg-green-400" : i === stage ? "bg-brand animate-pulse" : "bg-slate-600"}`} />
                  {t}{i === stage ? "…" : i < stage ? " ✓" : ""}
                </li>
              ))}
              <li className="text-xs text-slate-600">{T.unggah.estimasi}</li>
            </ol>
          )}
        </div>
      </Card>
      <div className="mt-3 text-right">
        <Button variant="secondary" onClick={() => reload()}><RefreshCw size={15} aria-hidden /> Muat ulang</Button>
      </div>

      {hapus && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => !hapusBusy && setHapus(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="hapus-judul"
            className="bg-surface border border-slate-200 rounded-2xl p-6 max-w-sm w-full max-h-[90dvh] overflow-y-auto anim-pop"
            onClick={(e) => e.stopPropagation()}>
            <h2 id="hapus-judul" className="font-bold text-lg text-[#0F1B3D]">{T.unggah.hapus}</h2>
            <p className="text-sm text-slate-700 mt-2">
              {hapus.kind === "requirement" ? T.unggah.hapusKonfirmasi : T.unggah.hapusPendukung}
            </p>
            <p className="text-xs text-slate-600 mt-1 truncate">{hapus.nama}</p>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setHapus(null)} disabled={hapusBusy}>{T.unggah.batal}</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={konfirmasiHapus} disabled={hapusBusy}>
                {hapusBusy ? "…" : T.unggah.ya}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
