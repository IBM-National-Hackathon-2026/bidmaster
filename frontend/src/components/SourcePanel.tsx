import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, authHeaders } from "../lib/utils";
import { T } from "../ui-text";

export type SourceRef =
  | { kind: "klien"; baris?: number; halaman?: number; paragraf?: number; kutipan: string }
  | { kind: "knowledge"; kode: string }
  | { kind: "katalog"; kode: string; nama: string; satuan: string; harga: number }
  | { kind: "pengguna"; label: string; nilai: string };

export type SourceDetail = { judul: string; meta: string; isi: string };

/** Label ringkas untuk sebuah sumber (dipakai tooltip & popover). */
export function labelSumber(s: SourceRef): string {
  switch (s.kind) {
    case "klien":
      return `${T.tinjau.sumberKlien} — ${s.baris ? "baris " + s.baris : "hal. " + s.halaman + ", par. " + s.paragraf}`;
    case "knowledge":
      return `${T.tinjau.sumberKnowledge} — ${s.kode}`;
    case "katalog":
      return `${T.tinjau.sumberKatalog} — ${s.kode}`;
    default:
      return `${s.label} (${T.tinjau.sumberPengguna})`;
  }
}

/**
 * Ambil ringkasan sumber untuk popover: judul, meta (jenis), dan cuplikan isi.
 * Untuk sumber klien, `dokumen` (nama file) dipakai sebagai judul bila ada.
 */
export function useSourceDetail(proposalId: number, s: SourceRef, dokumen = "", enabled = true): { detail: SourceDetail | null; err: string } {
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [err, setErr] = useState("");
  const key = JSON.stringify(s);

  useEffect(() => {
    setDetail(null);
    setErr("");
    if (!enabled) return;
    if (s.kind === "pengguna") {
      setDetail({ judul: s.label, meta: T.tinjau.sumberPengguna, isi: s.nilai || "—" });
      return;
    }
    if (s.kind === "katalog") {
      setDetail({
        judul: s.nama,
        meta: `${T.tinjau.sumberKatalog} · ${s.kode}`,
        isi: `Satuan: ${s.satuan} · Acuan: Rp ${s.harga.toLocaleString("id-ID")}`,
      });
      return;
    }
    if (s.kind === "knowledge") {
      api<{ quotes: { kode: string; teks: string }[] }>(
        `/api/knowledge/quotes?codes=${encodeURIComponent(s.kode)}`, { headers: authHeaders() })
        .then((j) => {
          const q = j.quotes[0];
          setDetail({ judul: q?.kode ?? s.kode, meta: T.tinjau.sumberKnowledge, isi: q?.teks ?? "" });
        })
        .catch((e) => setErr(e instanceof Error ? e.message : T.umum.cobaLagi));
      return;
    }
    const q = new URLSearchParams();
    if (s.baris) q.set("baris", String(s.baris));
    if (s.halaman) q.set("halaman", String(s.halaman));
    if (s.paragraf) q.set("paragraf", String(s.paragraf));
    q.set("kutipan", s.kutipan);
    api<{ label: string; target: string }>(
      `/api/proposals/${proposalId}/source?${q.toString()}`, { headers: authHeaders() })
      .then((b) => setDetail({ judul: dokumen || b.label || T.tinjau.sumberKlien, meta: `${T.tinjau.sumberKlien} · ${b.label}`, isi: b.target }))
      .catch((e) => setErr(e instanceof Error ? e.message : T.umum.cobaLagi));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId, key, dokumen, enabled]);

  return { detail, err };
}

/** Panel sumber lengkap (sidebar kanan; bottom-sheet di layar kecil). */
export function SourcePanel({ proposalId, s, onClose, returnTo }: {
  proposalId: number; s: SourceRef; onClose: () => void; returnTo: HTMLElement | null;
}) {
  const [body, setBody] = useState<{ label: string; target: string; atas: { label: string; teks: string }[]; bawah: { label: string; teks: string }[] } | null>(null);
  const [quote, setQuote] = useState<{ kode: string; teks: string } | null>(null);
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    setErr("");
    setBody(null);
    setQuote(null);
    if (s.kind === "klien") {
      const q = new URLSearchParams();
      if (s.baris) q.set("baris", String(s.baris));
      if (s.halaman) q.set("halaman", String(s.halaman));
      if (s.paragraf) q.set("paragraf", String(s.paragraf));
      q.set("kutipan", s.kutipan);
      api<{ label: string; target: string; atas: { label: string; teks: string }[]; bawah: { label: string; teks: string }[] }>(
        `/api/proposals/${proposalId}/source?${q.toString()}`, { headers: authHeaders() })
        .then(setBody).catch((e) => setErr(e instanceof Error ? e.message : T.umum.cobaLagi));
    } else if (s.kind === "knowledge") {
      api<{ quotes: { kode: string; teks: string }[] }>(
        `/api/knowledge/quotes?codes=${encodeURIComponent(s.kode)}`, { headers: authHeaders() })
        .then((j) => setQuote(j.quotes[0] ?? null)).catch((e) => setErr(e instanceof Error ? e.message : T.umum.cobaLagi));
    }
  }, [s, proposalId]);

  function close() {
    onClose();
    returnTo?.focus();
  }

  function hi(teks: string, kutipan: string) {
    const k = kutipan.trim();
    if (k === "") return teks;
    const i = teks.toLowerCase().indexOf(k.toLowerCase());
    if (i < 0) return teks;
    return <>{teks.slice(0, i)}<mark className="bg-brand/40 text-inherit rounded px-0.5">{teks.slice(i, i + k.length)}</mark>{teks.slice(i + k.length)}</>;
  }

  return (
    <div className="fixed inset-0 z-[70]" role="presentation" onClick={close}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={T.tinjau.sumber}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-surface border-l border-slate-200 shadow-2xl overflow-y-auto p-5
                   max-sm:top-auto max-sm:bottom-0 max-sm:h-[75vh] max-sm:w-full max-sm:border-l-0 max-sm:border-t max-sm:rounded-t-2xl">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-bold text-[#0F1B3D] flex-1">{T.tinjau.sumber}</h2>
          <button onClick={close} aria-label={T.umum.tutup}
            className="p-2.5 min-w-11 min-h-11 text-slate-600 hover:text-[#0F1B3D] rounded-lg hover:bg-slate-100">
            <X size={18} aria-hidden />
          </button>
        </div>
        {err !== "" && <p className="text-sm text-red-700" role="alert">{err} <button onClick={() => setErr("")} className="underline">{T.umum.cobaLagi}</button></p>}
        {s.kind === "pengguna" && (
          <div>
            <p className="text-xs text-slate-600">{s.label} · {T.tinjau.sumberPengguna}</p>
            <p className="text-base text-slate-800 mt-2">{s.nilai || "—"}</p>
          </div>
        )}
        {s.kind === "katalog" && (
          <div>
            <p className="text-xs text-slate-600">{T.tinjau.sumberKatalog} — {s.kode}</p>
            <p className="text-base text-slate-800 mt-2">{s.nama}</p>
            <p className="text-sm text-slate-600">Satuan: {s.satuan} · Acuan: Rp {s.harga.toLocaleString("id-ID")}</p>
          </div>
        )}
        {s.kind === "knowledge" && (
          <div>
            <p className="text-xs text-slate-600">{T.tinjau.sumberKnowledge} — {quote?.kode ?? s.kode} (read-only)</p>
            {quote
              ? <p className="text-base text-slate-800 mt-2">{quote.teks}</p>
              : <p className="text-sm text-slate-600 mt-2">{T.umum.memuat}</p>}
          </div>
        )}
        {s.kind === "klien" && (
          <div>
            <p className="text-xs text-slate-600">{T.tinjau.sumberKlien} — {body?.label ?? "…"}</p>
            {!body ? <p className="text-sm text-slate-600 mt-2">{T.umum.memuat}</p> : <>
              {body.atas.map((a) => <p key={a.label} className="text-sm text-slate-600 mt-2"><span className="text-xs">{a.label}</span><br />{a.teks}</p>)}
              <p className="text-base text-slate-800 mt-3 border-l-2 border-brand pl-3">
                <span className="text-xs text-slate-600 block">{body.label} · {T.umum.teksDikutip}</span>
                {hi(body.target, s.kutipan)}
              </p>
              {body.bawah.map((a) => <p key={a.label} className="text-sm text-slate-600 mt-2"><span className="text-xs">{a.label}</span><br />{a.teks}</p>)}
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
