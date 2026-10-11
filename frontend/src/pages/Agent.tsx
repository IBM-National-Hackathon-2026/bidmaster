import { Check, Copy, FileText, Lock, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { Skeleton } from "../components/ui/controls";
import { toast } from "../components/ui/toast";
import { api, authHeaders } from "../lib/utils";
import { T } from "../ui-text";

type Msg = { role: "user" | "bot"; text: string; err?: boolean };

const HINTS = [
  "Buatkan draft proposal untuk kafe di Surabaya, butuh web + reservasi, budget 10jt",
  "Revisi proposal: tambahkan fitur galeri menu",
  "Buatkan PRD dari brief website tadi",
  "Tender dinas pemerintah, pagu 50 juta, durasi 3 bulan",
];

/** Markdown ringan → HTML dengan blok & spasi yang benar. */
function md(text: string): string {
  let s = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c: string) => `<pre><code>${c.replace(/\n$/, "")}</code></pre>`);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>");
  s = s.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  s = s.replace(/^\s*(?:---|\*\*\*)\s*$/gm, "<hr>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, h: string, rows: string) => {
    const th = h.split("|").map((c) => c.trim()).filter(Boolean).map((c) => `<th>${c}</th>`).join("");
    const tr = rows.trim().split("\n").map((r) =>
      `<tr>${r.split("|").map((c) => c.trim()).filter(Boolean).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  });
  return s.split(/\n{2,}/).map((b) => {
    const t = b.trim();
    if (!t) return "";
    if (/^<(h[1-6]|table|pre|ul|ol|blockquote|hr)/.test(t)) return t;
    const lines = t.split("\n");
    if (lines.every((l) => /^\s*[-*+] /.test(l))) {
      return `<ul>${lines.map((l) => `<li>${l.replace(/^\s*[-*+] /, "")}</li>`).join("")}</ul>`;
    }
    if (lines.every((l) => /^\s*\d+[.)] /.test(l))) {
      return `<ol>${lines.map((l) => `<li>${l.replace(/^\s*\d+[.)] /, "")}</li>`).join("")}</ol>`;
    }
    return `<p>${lines.map((l) => l.trim()).filter(Boolean).join("<br>")}</p>`;
  }).filter(Boolean).join("\n");
}

function BotSkeleton() {
  return (
    <div className="flex gap-2.5" aria-hidden>
      <div className="w-8 h-8 shrink-0 rounded-lg skeleton" />
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 w-[min(70%,26rem)] space-y-2.5">
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); toast(T.agen.tersalin, "ok"); setTimeout(() => setDone(false), 1600); }).catch(() => {}); }}
      aria-label={T.agen.salin}
      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-slate-500 hover:text-brand p-1.5 rounded-md hover:bg-slate-100 inline-flex items-center gap-1">
      {done ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      <span className="text-[0.68rem] font-semibold">{done ? T.agen.tersalin : T.agen.salin}</span>
    </button>
  );
}

export default function Agent({ compact = false }: { compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const { user } = useAuth();
  const logged = user !== null;
  const box = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(() => "bm-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7));

  useEffect(() => {
    api<{ configured: boolean }>("/api/agent/status").then((j) => setReady(j.configured)).catch(() => setReady(false));
  }, []);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string, retry = false) {
    const t = text.trim();
    if (!t || busy) return;
    if (!logged) { toast(T.agen.belumLogin, "warn"); return; }
    if (!retry) setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setBusy(true);
    try {
      const j = await api<{ text: string }>("/api/agent", {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: t, flow: "bidmaster_proposal_generator", session_id: sessionId }),
      });
      setMsgs((m) => [...m, { role: "bot", text: j.text }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "bot", text: `**${T.agen.gagal}**\n\n${e instanceof Error ? e.message : ""}`.trim(), err: true }]);
    } finally {
      setBusy(false);
    }
  }

  const canSend = input.trim() !== "" && !busy && ready === true;

  return (
    <div className={`flex overflow-hidden bg-white border border-[#C9DDEE] shadow-[0_10px_36px_rgba(15,27,61,0.10)]
      ${compact ? "h-[74vh] supports-[height:100dvh]:h-[74dvh] rounded-2xl" : "h-[calc(100dvh-4rem)] supports-[height:100dvh]:h-[calc(100dvh-4rem)] rounded-2xl"}`}>
      {/* Sidebar info (desktop) */}
      <aside className="w-64 shrink-0 bg-[#F7F9FE] border-r border-slate-200 hidden lg:flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-600">
          <span className={`w-2 h-2 rounded-full ${ready ? "bg-green-500 animate-pulse" : ready === false ? "bg-red-500" : "bg-slate-400"}`} />
          {ready === null ? T.agen.memeriksa : ready ? T.agen.terhubung : T.agen.tidakTerhubung}
        </div>
        <div className="p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide mb-2 text-slate-500">{T.agen.flowAktif}</h3>
          <div className="bg-brand-light text-brand font-semibold text-xs rounded-lg px-3 py-2.5 flex items-center gap-2 border border-brand/20">
            <FileText size={15} aria-hidden /> BidMaster Proposal Generator
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 mt-auto text-xs text-slate-500">
          {T.agen.sesi} <code className="bg-slate-200/70 px-1.5 py-0.5 rounded">{sessionId.slice(0, 16)}…</code>
        </div>
      </aside>

      {/* Kolom chat */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur">
          <img src="/BidMaster-Ikon-1024.png" alt="" className="w-9 h-9 rounded-xl" aria-hidden />
          <div className="min-w-0">
            <p className="font-bold text-[#0F1B3D] leading-tight">{T.agen.judul}</p>
            <p className="text-xs text-slate-500 truncate">{T.agen.sub}</p>
          </div>
          <span className={`ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ready ? "bg-green-50 text-green-700" : ready === false ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-green-500" : ready === false ? "bg-red-500" : "bg-slate-400"}`} />
            {ready === null ? T.agen.memeriksa : ready ? T.agen.terhubung : T.agen.tidakTerhubung}
          </span>
        </div>

        {!logged && (
          <div className="shrink-0 mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>Belum login — <a href="/login" className="text-brand font-semibold underline">{T.agen.masuk}</a> untuk bertanya ke Bob.</span>
          </div>
        )}
        {ready === false && (
          <div className="shrink-0 mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{T.agen.mesinMati}</span>
          </div>
        )}

        {/* Area pesan — HANYA ini yang scroll */}
        <div ref={box} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 flex flex-col gap-5">
          {msgs.length === 0 && !busy && (
            <div className="flex flex-col items-center text-center my-auto gap-3 anim-fade-up">
              <img src="/BidMaster-Ikon-1024.png" alt="Bob" className="w-[72px] h-[72px] rounded-2xl anim-pulse-ring" />
              <h3 className="text-xl font-bold text-[#0F1B3D]">{T.agen.sapaJudul}</h3>
              <p className="text-slate-600 text-sm max-w-md">{T.agen.sapaIsi}</p>
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i} className={`anim-msg group flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 shrink-0 flex items-center justify-center" aria-hidden>
                {m.role === "user"
                  ? <span className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">K</span>
                  : <img src="/BidMaster-Ikon-1024.png" alt="Bob" className="w-8 h-8 rounded-lg" />}
              </div>
              <div className="max-w-[85%] sm:max-w-[74%] min-w-0">
                {m.role === "user"
                  ? <div className="bg-brand text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-[0_4px_20px_rgba(15,27,61,0.22)]">{m.text}</div>
                  : <div className={`bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_2px_14px_rgba(15,27,61,0.06)] ${m.err ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                      <div className={`chat-md ${m.err ? "text-red-800" : ""}`} dangerouslySetInnerHTML={{ __html: md(m.text) }} />
                      {m.err && (
                        <button onClick={() => send(msgs[i - 1]?.text ?? "", true)} disabled={busy}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline disabled:opacity-50">
                          <RefreshCw size={13} aria-hidden /> {T.agen.ulangi}
                        </button>
                      )}
                    </div>}
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <span className="text-[0.7rem] text-slate-400">{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                  {m.role === "bot" && !m.err && <CopyButton text={m.text} />}
                </div>
              </div>
            </div>
          ))}
          {busy && <BotSkeleton />}
        </div>

        {/* Komposer — menetap di bawah */}
        <div className="shrink-0 border-t border-slate-200 bg-white/90 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {msgs.length === 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2 max-w-3xl mx-auto">
              {HINTS.map((h) => (
                <button key={h} onClick={() => setInput(h)} disabled={busy}
                  className="bg-slate-100 border border-slate-200 rounded-full px-3.5 py-2 text-xs text-slate-600 hover:border-brand/60 hover:text-brand transition-colors min-h-11 inline-flex items-center max-w-full">
                  <span className="truncate">{h.length > 48 ? h.slice(0, 48) + "…" : h}</span></button>
              ))}
            </div>
          )}
          <form className="flex gap-2 max-w-3xl mx-auto items-end" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) send(input); } }}
              placeholder={T.agen.placeholder} maxLength={4000} disabled={busy}
              className="flex-1 resize-none border-[1.5px] border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-base text-slate-800 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20 disabled:bg-slate-50" />
            <button type="submit" disabled={!canSend} aria-label={T.agen.kirim} title={T.agen.kirim}
              className="w-11 h-11 shrink-0 rounded-xl bg-brand hover:bg-brand-dark text-white flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(15,27,61,0.25)]">
              <Send size={18} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
