import { FileText, Lock, Send, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { api, authHeaders } from "../lib/utils";

type Msg = { role: "user" | "bot"; text: string; err?: boolean };

const HINTS = [
  "Buatkan draft proposal untuk kafe di Surabaya, butuh web + reservasi, budget 10jt",
  "Revisi proposal: tambahkan fitur galeri menu",
  "Buatkan PRD dari brief website tadi",
  "Tender dinas pemerintah, pagu 50 juta, durasi 3 bulan",
];

function md(text: string): string {
  let s = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  s = s.replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, h: string, rows: string) => {
    const th = h.split("|").map((c) => c.trim()).filter(Boolean).map((c) => `<th>${c}</th>`).join("");
    const tr = rows.trim().split("\n").map((r) =>
      `<tr>${r.split("|").map((c) => c.trim()).filter(Boolean).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  });
  return s.split(/\n{2,}/).map((b) => {
    const t = b.trim();
    if (!t) return "";
    if (/^<(h[1-6]|table|pre|ul)/.test(t)) return t;
    if (/^([-*+] )/.test(t)) return `<ul>${t.split("\n").map((l) => `<li>${l.replace(/^[-*+] /, "")}</li>`).join("")}</ul>`;
    return `<p>${t.replace(/\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n");
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
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [msgs, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (!logged) { setMsgs((m) => [...m, { role: "bot", text: "**Harus login dulu.** Silakan masuk lewat halaman Login.", err: true }]); return; }
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setBusy(true);
    try {
      const j = await api<{ text: string }>("/api/agent", {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: t, flow: "bidmaster_proposal_generator", session_id: sessionId }),
      });
      setMsgs((m) => [...m, { role: "bot", text: j.text }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "bot", text: `**Gagal:** ${e instanceof Error ? e.message : "coba lagi."}`, err: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex overflow-hidden ${compact ? "h-[70vh] rounded-xl border border-white/10" : "h-[calc(100vh-60px)]"}`}>
      <aside className="w-64 shrink-0 bg-surface border-r border-white/10 hidden md:flex flex-col">
        <div className="p-4 border-b border-white/10 text-xs text-slate-300">
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ready ? "bg-green-400" : ready === false ? "bg-red-400" : "bg-slate-500"} ${ready ? "animate-pulse" : ""}`} />
          {ready === null ? "Memeriksa…" : ready ? "Langflow terhubung" : "Langflow tidak terhubung"}
        </div>
        <div className="p-4">
          <h3 className="text-sm font-bold mb-2 text-slate-200">Flow aktif</h3>
          <div className="bg-brand-light text-brand font-semibold text-xs rounded-lg px-2.5 py-2 flex items-center gap-2 border border-brand/20"><FileText size={15} aria-hidden /> BidMaster Proposal Generator</div>
        </div>
        <div className="p-4 border-t border-white/10 mt-auto text-xs text-slate-400">
          Session <code className="bg-white/10 px-1 rounded text-slate-300">{sessionId.slice(0, 18)}…</code>
        </div>
      </aside>
      <div className="flex-1 flex flex-col bg-night min-w-0 relative">
        <div className="hero-glow w-[500px] h-[300px] left-1/2 top-[-140px] -translate-x-1/2" style={{ background: "radial-gradient(ellipse, rgba(229,72,77,0.09), transparent 65%)" }} aria-hidden="true" />
        {!logged && (
          <div className="m-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-200 flex items-start gap-2 relative">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>Belum login — <a href="/login" className="text-brand font-semibold">masuk dulu</a>.</span>
          </div>
        )}
        {ready === false && (
          <div className="m-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-200 flex items-start gap-2 relative">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>Langflow belum terhubung — isi <code className="bg-white/10 px-1 rounded">LANGFLOW_URL</code> + <code className="bg-white/10 px-1 rounded">LANGFLOW_API_KEY</code> di backend <code className="bg-white/10 px-1 rounded">.env</code>.</span>
          </div>
        )}
        <div ref={box} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {msgs.length === 0 && (
            <div className="flex flex-col items-center text-center my-auto gap-3 anim-fade-up">
              <img src="/BidMaster-Ikon-1024.png" alt="Bob" className="w-[72px] h-[72px] rounded-2xl anim-pulse-ring" />
              <h3 className="text-xl font-bold text-white">Halo! Saya Bob.</h3>
              <p className="text-slate-400 text-sm max-w-md">Ceritakan kebutuhan tender — draft, revisi, dan PRD lewat satu flow Langflow.</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`anim-msg flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-7 h-7 shrink-0 flex items-center justify-center" aria-hidden="true">
                {m.role === "user"
                  ? <span className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-[0.7rem] font-bold text-white">K</span>
                  : <img src="/BidMaster-Ikon-1024.png" alt="Bob" className="w-7 h-7 rounded-lg" />}</div>
              <div className="max-w-[72%]">
                {m.role === "user"
                  ? <div className="bg-brand text-white rounded-2xl rounded-br px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-[0_4px_20px_rgba(229,72,77,0.25)]">{m.text}</div>
                  : <div className={`bg-surface border rounded-2xl rounded-bl px-3.5 py-2.5 text-sm max-w-none text-slate-100 ${m.err ? "border-red-500/60 text-red-200" : "border-white/10"}`}
                      dangerouslySetInnerHTML={{ __html: md(m.text) }} />}
                <div className="text-[0.72rem] text-slate-500 mt-1">{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 px-1" aria-live="polite">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            <span className="text-sm text-slate-400 italic">Bob sedang berpikir…</span>
          </div>}
        </div>
        <div className="bg-surface border-t border-white/10 p-3 relative">
          <div className="flex gap-1.5 flex-wrap mb-2 max-w-4xl mx-auto">
            {HINTS.map((h) => (
              <button key={h} onClick={() => setInput(h)}
                className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-slate-300 hover:border-brand/60 hover:text-brand transition-colors">
                {h.length > 48 ? h.slice(0, 48) + "…" : h}</button>
            ))}
          </div>
          <form className="flex gap-2 max-w-4xl mx-auto" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ceritakan tentang client atau tender… (Enter kirim, Shift+Enter baris baru)"
              maxLength={4000}
              className="flex-1 resize-none border-[1.5px] border-white/10 bg-night rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20" />
            <button disabled={!input.trim() || busy || !ready}
              className="w-11 h-11 rounded-xl bg-brand hover:bg-brand-dark text-white flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(229,72,77,0.3)]" title="Kirim" aria-label="Kirim pesan">
              <Send size={18} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
