import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { labelSumber, useSourceDetail, type SourceRef } from "./SourcePanel";
import { T } from "../ui-text";

const GAP = 8;
const WIDTH = 340;

/**
 * Angka sitasi kecil inline (gaya NotebookLM): diklik → popover mengambang
 * berisi sumbernya. Tombol "Lihat sumber lengkap" membuka panel samping.
 */
export function CiteMarker({ n, s, proposalId, dokumen = "", onFull }: {
  n: number; s: SourceRef; proposalId: number; dokumen?: string;
  onFull: (s: SourceRef, anchor: HTMLElement) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const { detail, err } = useSourceDetail(proposalId, s, dokumen, open);
  const label = labelSumber(s);

  // Tutup saat klik di luar / Esc.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  // Posisikan popover agar selalu di dalam viewport.
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const h = pop.current?.offsetHeight ?? 200;
      const w = Math.min(WIDTH, window.innerWidth - 2 * GAP);
      let left = r.left;
      let top = r.bottom + GAP;
      if (top + h > window.innerHeight - GAP) top = Math.max(GAP, r.top - GAP - h);
      left = Math.min(Math.max(GAP, left), window.innerWidth - w - GAP);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, detail]);

  return (
    <span className="relative inline-block align-baseline">
      <button
        ref={btn}
        type="button"
        aria-label={`${T.umum.sumberKe} ${n}: ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`align-super text-[0.62rem] font-bold leading-none px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer
          ${open ? "bg-brand text-white border-brand" : "bg-brand-light text-brand border-brand/40 hover:bg-brand/20"}`}>
        {n}
      </button>

      {/* Tooltip singkat saat hover (hanya bila popover tertutup) */}
      {hover && !open && (
        <span role="tooltip"
          className="pointer-events-none absolute z-[60] left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap
                     rounded-lg bg-[#0F1B3D] text-white text-[0.7rem] px-2.5 py-1.5 shadow-lg max-w-[16rem] truncate">
          {label}
        </span>
      )}

      {open && createPortal(
        <div ref={pop} role="dialog" aria-label={`${T.umum.sumberKe} ${n}`}
          style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: `min(${WIDTH}px, calc(100vw - 16px))` }}
          className="z-[75] bg-white border border-[#C9DDEE] rounded-2xl shadow-2xl anim-pop text-left">
          <div className="flex items-start gap-2 px-4 pt-3.5 pb-2.5 border-b border-slate-100">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-brand text-white text-[0.65rem] font-bold grid place-items-center">{n}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0F1B3D] leading-snug truncate" title={detail?.judul || label}>
                {detail?.judul || label}
              </p>
              <p className="text-[0.68rem] text-slate-500">{detail?.meta ?? T.tinjau.sumber}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label={T.umum.tutup}
              className="-mt-1 -mr-1 p-1.5 rounded-lg text-slate-500 hover:text-[#0F1B3D] hover:bg-slate-100">
              <X size={15} aria-hidden />
            </button>
          </div>

          <div className="px-4 py-3 max-h-[42vh] overflow-y-auto">
            {err !== ""
              ? <p className="text-sm text-red-700" role="alert">{err}</p>
              : detail
                ? <p className="text-[0.85rem] text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.isi || "—"}</p>
                : <p className="text-sm text-slate-500">{T.umum.memuat}</p>}
          </div>

          <div className="px-4 pb-3.5">
            <button
              onClick={() => { setOpen(false); if (btn.current) onFull(s, btn.current); }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-brand text-brand
                         text-sm font-semibold py-2 min-h-11 hover:bg-brand-light transition-colors">
              <Maximize2 size={14} aria-hidden /> {T.umum.lihatSumber}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}
