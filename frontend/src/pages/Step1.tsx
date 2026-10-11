import { ArrowRight, Building2, CalendarClock, FileText, FileUp, Info, RefreshCw, Sparkles, Trash2, TriangleAlert, UploadCloud, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, FieldError, Input, Label, Select } from "../components/ui/controls";
import { toast } from "../components/ui/toast";
import { ProposalApi, type Proposal } from "../lib/proposals";
import { CONTOH_REQUIREMENT, T } from "../ui-text";

const JENIS = ["Pemerintahan", "BUMN/BUMD", "Swasta", "Pendidikan", "Kesehatan", "Lainnya"];
const ACCEPT = [".txt", ".md", ".csv", ".json", ".pdf", ".docx"];
const MAX_BYTES = 200 * 1024;

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
  const [bisaFallback, setBisaFallback] = useState(false);
  const [pesan, setPesan] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const supRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ProposalApi.company().then((c) => setCompany(`${c.nama_resmi} — ${c.tagline}`)).catch(() => setCompany(""));
  }, []);

  const instansiErr = p.instansi.trim() !== "" && p.instansi.trim().length < 3 ? T.validasi.instansiPendek : "";

  function rpFormat(v: number | null): string {
    if (v === null) return "";
    return "Rp " + v.toLocaleString("id-ID");
  }
  function rpParse(s: string): number | null {
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return Number.isNaN(n) ? null : n;
  }

  function validasiFile(f: File): string {
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPT.includes(ext)) return T.validasi.fileFormat;
    if (f.size > MAX_BYTES) return T.validasi.fileBesar;
    return "";
  }

  async function doUpload(f: File, kind: "requirement" | "pendukung") {
    setErr("");
    setPesan("");
    const v = validasiFile(f);
    if (v !== "") { setErr(v); toast(v, "warn"); if (inputRef.current) inputRef.current.value = ""; if (supRef.current) supRef.current.value = ""; return; }
    if (kind === "requirement") { setUploading(true); setJustUploaded(false); }
    else { setSupUploading(true); setSupJust(false); }
    try {
      const j = await ProposalApi.upload(p.id, f, kind);
      setP(j.proposal);
      toast(`${f.name} — ${T.unggah.berhasil}`, "ok");
      if (kind === "requirement") { setJustUploaded(true); setTimeout(() => setJustUploaded(false), 2600); }
      else { setSupJust(true); setTimeout(() => setSupJust(false), 2600); }
    } catch (e) {
      const m = e instanceof Error ? e.message : T.unggah.unggahGagal;
      setErr(m); toast(m, "error");
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
      toast(T.unggah.dihapus, "ok");
      setTimeout(() => setPesan(""), 2600);
      setHapus(null);
    } catch (e) {
      const m = e instanceof Error ? e.message : T.unggah.cobaLagi;
      setErr(m); toast(m, "error");
    } finally {
      setHapusBusy(false);
    }
  }

  async function analyze(fallback = false) {
    if (p.req_teks.trim() === "") { setErr(T.unggah.perluFile); toast(T.unggah.perluFile, "warn"); return; }
    setErr("");
    setBisaFallback(false);
    setBusy(true);
    setStage(0);
    const tick = setInterval(() => setStage((s) => (s < 3 ? s + 1 : s)), 20000);
    try {
      const j = await ProposalApi.analyze(p.id, fallback);
      setP(j.proposal);
      if (j.ringkasan.fallback) {
        toast(T.unggah.fallbackSukses, "warn");
      } else {
        toast("Analisis selesai.", "ok");
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : T.unggah.unggahGagal;
      const data = (e as { data?: { bisa_fallback?: boolean } }).data;
      setErr(m); toast(m, "error");
      if (data?.bisa_fallback) setBisaFallback(true);
    } finally {
      clearInterval(tick);
      setBusy(false);
      setStage(-1);
    }
  }

  const adaReq = p.req_nama !== "" || p.req_teks.trim() !== "";

  return (
    <div className="anim-fade-up space-y-4">
      {/* Header langkah */}
      <div className="grad-brand rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -mr-10 -mt-10" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-3 py-1">
            <Sparkles size={13} aria-hidden /> Langkah 1 dari 3
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2">{T.unggah.judul}</h2>
          <p className="text-white/80 text-sm mt-1">Unggah dokumen KAK/requirement, isi data dasar, lalu jalankan analisis.</p>
        </div>
      </div>

      <Card className="space-y-4">
        {/* Zona unggah / kartu dokumen terunggah */}
        {!adaReq ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f, "requirement"); }}
            onClick={() => { if (!uploading) inputRef.current?.click(); }}
            role="button" tabIndex={0} aria-label={T.unggah.zona} aria-busy={uploading}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!uploading) inputRef.current?.click(); } }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all min-h-52 flex flex-col items-center justify-center gap-3 ${
              drag ? "border-brand bg-brand-light scale-[1.01]" : "border-slate-300 bg-gradient-to-b from-slate-50 to-white hover:border-brand/60 hover:shadow-[0_10px_30px_rgba(15,27,61,0.08)]"}`}>
            {uploading ? (
              <div className="w-full max-w-sm flex flex-col items-center gap-3" aria-live="polite">
                <span className="w-14 h-14 rounded-2xl grad-brand flex items-center justify-center text-white">
                  <UploadCloud size={26} className="animate-bounce" aria-hidden />
                </span>
                <span className="font-semibold text-slate-800">{T.unggah.sedangUnggah}</span>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-full bg-brand progress-stripes" />
                </div>
              </div>
            ) : (
              <>
                <span className="w-14 h-14 rounded-2xl bg-brand-light border border-brand/20 flex items-center justify-center text-brand">
                  <FileUp size={26} aria-hidden />
                </span>
                <span className="font-bold text-slate-800 text-lg">{T.unggah.zona}</span>
                <span className="text-sm text-slate-500">{T.unggah.format}</span>
                <span className="text-xs text-brand font-semibold underline">atau klik untuk memilih file</span>
              </>
            )}
            <input ref={inputRef} type="file" hidden accept={ACCEPT.join(",")}
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) doUpload(f, "requirement"); }} />
          </div>
        ) : (
          <div className={`border-[1.5px] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 bg-green-50 border-green-300 ${justUploaded ? "anim-pop" : ""}`} role="status">
            <span className="relative shrink-0 w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center" aria-hidden>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path className="check-path" d="M4 12.5l5 5L20 6.5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.7rem] font-bold uppercase tracking-wide text-green-800">{T.unggah.terunggah}</span>
                {justUploaded && <span className="text-[0.7rem] font-semibold text-green-700 anim-slide-up">{T.unggah.berhasil}</span>}
              </div>
              <p className="text-base font-semibold text-[#0F1B3D] mt-1 flex items-center gap-1.5 min-w-0">
                <FileText size={16} className="text-green-700 shrink-0" aria-hidden /><span className="truncate">{p.req_nama || "dokumen"}</span>
              </p>
              {p.req_jumlah > 0 && <p className="text-sm text-slate-600 mt-0.5">{p.req_jumlah} {p.req_satuan} · {T.unggah.berhasil}</p>}
            </div>
            <div className="flex flex-row sm:flex-col gap-2 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <RefreshCw size={14} aria-hidden /> {T.unggah.ganti}
              </Button>
              <Button size="sm" variant="secondary" className="text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => setHapus({ kind: "requirement", nama: p.req_nama || "dokumen" })} disabled={uploading}>
                <Trash2 size={14} aria-hidden /> {T.unggah.hapus}
              </Button>
            </div>
            <input ref={inputRef} type="file" hidden accept={ACCEPT.join(",")}
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) doUpload(f, "requirement"); }} />
          </div>
        )}

        {pesan !== "" && <div className="anim-slide-up" role="status"><Alert kind="ok">{pesan}</Alert></div>}

        {/* Data dasar */}
        <div className="grid sm:grid-cols-2 gap-x-5 gap-y-1">
          <div>
            <Label htmlFor="instansi"><Building2 size={14} className="inline -mt-0.5 mr-1 text-slate-500" aria-hidden />{T.unggah.instansi}</Label>
            <Input id="instansi" value={p.instansi} maxLength={80} placeholder="cth Dinas Komunikasi dan Informatika"
              aria-invalid={instansiErr !== ""}
              onChange={(e) => { setP({ ...p, instansi: e.target.value }); autosave({ instansi: e.target.value }); }} />
            <FieldError>{instansiErr}</FieldError>
          </div>
          <div>
            <Label htmlFor="jenis">{T.unggah.jenis}</Label>
            <Select id="jenis" value={p.jenis_instansi}
              onChange={(e) => { setP({ ...p, jenis_instansi: e.target.value }); autosave({ jenis_instansi: e.target.value }); }}>
              {JENIS.map((j) => <option key={j}>{j}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="pagu"><Wallet size={14} className="inline -mt-0.5 mr-1 text-slate-500" aria-hidden />{T.unggah.pagu}</Label>
            <Input id="pagu" inputMode="numeric" value={rpFormat(p.pagu)} placeholder="cth Rp 20.000.000"
              onChange={(e) => { const v = rpParse(e.target.value); setP({ ...p, pagu: v }); autosave({ pagu: v }); }} />
            <p className="text-xs text-slate-500 mt-1">{T.unggah.paguHint}</p>
          </div>
          <div>
            <Label htmlFor="durasi"><CalendarClock size={14} className="inline -mt-0.5 mr-1 text-slate-500" aria-hidden />{T.unggah.durasi}</Label>
            <Input id="durasi" type="number" min={1} max={52} value={p.durasi_minggu}
              aria-invalid={p.durasi_minggu < 1 || p.durasi_minggu > 52}
              onChange={(e) => { const v = Math.max(1, Math.min(52, parseInt(e.target.value || "12", 10))); setP({ ...p, durasi_minggu: v }); autosave({ durasi_minggu: v }); }} />
            {(p.durasi_minggu < 1 || p.durasi_minggu > 52) && <FieldError>{T.validasi.durasiRange}</FieldError>}
          </div>
        </div>

        {/* Dokumen pendukung */}
        <div className="border border-[#C9DDEE] rounded-2xl p-4 bg-[#F7F9FE]">
          <h3 className="font-bold text-sm text-[#0F1B3D]">{T.unggah.pendukungJudul}</h3>
          <p className="text-xs text-slate-500">{T.unggah.pendukungKet}</p>
          {p.pendukung.length > 0 && (
            <ul className="mt-3 space-y-2">
              {p.pendukung.map((d, i) => (
                <li key={`${d.nama}-${i}`}
                  className={`flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 ${supJust && i === p.pendukung.length - 1 ? "anim-pop" : ""}`}>
                  <FileText size={16} className="text-brand shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{d.nama}</span>
                  <span className="text-xs text-slate-500 shrink-0 hidden sm:inline">{d.jumlah} {d.satuan}</span>
                  <button onClick={() => setHapus({ kind: "pendukung", index: i, nama: d.nama })}
                    aria-label={`${T.unggah.hapus} ${d.nama}`}
                    className="text-red-700 hover:bg-red-50 rounded-lg p-2.5 min-w-11 min-h-11 inline-flex items-center justify-center shrink-0">
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => supRef.current?.click()} disabled={supUploading}>
              <FileUp size={14} aria-hidden /> {supUploading ? T.unggah.sedangUnggah : T.unggah.tambahPendukung}
            </Button>
            {supUploading && <span className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden"><span className="block h-full w-full bg-brand progress-stripes" /></span>}
            <input ref={supRef} type="file" hidden accept={ACCEPT.join(",")}
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) doUpload(f, "pendukung"); }} />
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-600 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
          <span>{company !== "" ? company + ". " : ""}{T.unggah.perusahaanBox}{" "}
            <button onClick={useContoh} className="text-brand font-semibold underline inline-flex items-center min-h-9 px-0.5">{T.unggah.contoh}</button></span>
        </div>

        {err !== "" && (
          <div role="alert" className="space-y-2">
            <Alert kind="error">{err}</Alert>
            {bisaFallback && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-900 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <TriangleAlert size={15} aria-hidden /> {T.unggah.fallbackJudul}
                </p>
                <p>{T.unggah.fallbackKet}</p>
                <Button size="sm" variant="secondary" onClick={() => analyze(true)} disabled={busy}>
                  {T.unggah.fallbackTombol}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Aksi analisis */}
        <div className="pt-1">
          <Button onClick={() => analyze()} disabled={busy} variant="accent" size="lg" className="w-full sm:w-auto">
            {busy ? "Menganalisis…" : T.unggah.analisis} <ArrowRight size={17} aria-hidden />
          </Button>
          {p.req_teks.trim() === "" && <p className="text-xs text-slate-500 mt-1.5">{T.unggah.perluFile}</p>}
          {busy && (
            <div className="mt-4 border border-[#C9DDEE] rounded-2xl p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" aria-hidden />
                <span className="text-sm font-semibold text-[#0F1B3D]">Sedang menganalisis dokumen…</span>
              </div>
              <ol className="space-y-2" aria-live="polite">
                {T.unggah.tahap.map((t, i) => (
                  <li key={t} className={`text-sm flex items-center gap-2 ${i < stage ? "text-green-700" : i === stage ? "text-[#0F1B3D] font-semibold" : "text-slate-500"}`}>
                    <span className={`w-2 h-2 rounded-full ${i < stage ? "bg-green-400" : i === stage ? "bg-brand animate-pulse" : "bg-slate-300"}`} />
                    {t}{i === stage ? "…" : i < stage ? " ✓" : ""}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-slate-500 mt-2">{T.unggah.estimasi}</p>
            </div>
          )}
        </div>
      </Card>

      <div className="text-right">
        <Button variant="secondary" size="sm" onClick={() => reload()}><RefreshCw size={15} aria-hidden /> Muat ulang</Button>
      </div>

      {hapus && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => !hapusBusy && setHapus(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="hapus-judul"
            className="bg-white border border-[#C9DDEE] rounded-2xl p-6 max-w-sm w-full max-h-[90dvh] overflow-y-auto anim-pop shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0"><Trash2 size={18} aria-hidden /></span>
              <h2 id="hapus-judul" className="font-bold text-lg text-[#0F1B3D]">{T.unggah.hapus}</h2>
            </div>
            <p className="text-sm text-slate-700 mt-3">
              {hapus.kind === "requirement" ? T.unggah.hapusKonfirmasi : T.unggah.hapusPendukung}
            </p>
            <p className="text-xs text-slate-500 mt-1 truncate">{hapus.nama}</p>
            <div className="mt-5 flex gap-2 justify-end">
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
