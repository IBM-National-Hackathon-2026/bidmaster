import { ArrowRight, Bot, FileText, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/controls";

const tools = [
  { to: "/app", Icon: FileText, t: "Buat Draft Tender", d: "11 bab proposal + RAB per-komponen dari form, qty, dan dokumen KAK." },
  { to: "/app#hasil", Icon: ShieldCheck, t: "Gate Korporat", d: "KAK terpetakan, total ≤ pagu, legalitas lengkap — BLOKIR berarti perbaiki." },
  { to: "/agent", Icon: Bot, t: "Bob Agent — AI", d: "Bahasa natural via Langflow: draft, revisi, PRD dalam satu flow." },
  { to: "/login", Icon: KeyRound, t: "Login & Audit Tim", d: "Sesi token 12 jam, peran, dan log audit setiap aksi." },
];

const steps = [
  ["Isi form & pilih komponen", "Instansi, pagu, durasi, lalu qty tiap komponen. Harga satuan terkunci katalog."],
  ["Tempel KAK & lengkapi legalitas", "Satu kebutuhan per baris; NIB/NPWP/akta wajib untuk tender."],
  ["Gate periksa, manusia setujui", "LOLOS + approve → export DOCX/PDF untuk panitia."],
];

export default function Landing() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <section className="relative text-center pt-16 pb-10 overflow-visible" aria-label="Pengantar">
        <div className="hero-glow w-[420px] h-[420px] left-[-120px] top-[-80px]" style={{ background: "radial-gradient(circle, rgba(229,72,77,0.16), transparent 65%)", animation: "float-slow 9s ease-in-out infinite" }} aria-hidden="true" />
        <div className="hero-glow w-[380px] h-[380px] right-[-100px] top-[40px]" style={{ background: "radial-gradient(circle, rgba(80,120,200,0.12), transparent 65%)", animation: "float-slow 11s ease-in-out infinite reverse" }} aria-hidden="true" />
        <div className="relative">
          <span className="anim-fade-up inline-flex items-center gap-1.5 bg-brand-light text-brand text-xs font-semibold px-3 py-1 rounded-full border border-brand/30 mb-5">
            <Zap size={13} aria-hidden /> Alat internal Business Development
          </span>
          <h1 className="anim-fade-up text-4xl md:text-5xl font-extrabold tracking-tight text-white" style={{ animationDelay: "80ms" }}>
            Draft tender selesai<br /><span className="text-brand">sebelum rapat berikutnya</span>
          </h1>
          <p className="anim-fade-up text-slate-400 mt-4 max-w-xl mx-auto" style={{ animationDelay: "160ms" }}>
            Isi form terstruktur. Harga dikunci katalog. Gate KAK, pagu, legalitas otomatis.
          </p>
          <div className="anim-fade-up flex gap-3 justify-center mt-6 flex-wrap" style={{ animationDelay: "240ms" }}>
            <Link to="/login"><Button size="lg">Masuk &amp; Mulai <ArrowRight size={17} aria-hidden /></Button></Link>
            <Link to="/app"><Button size="lg" variant="secondary">Lihat Alur Kerja</Button></Link>
          </div>
          <p className="anim-fade-up text-xs text-slate-500 mt-3" style={{ animationDelay: "320ms" }}>
            Login demo: <code className="bg-white/10 px-1.5 py-0.5 rounded">admin / bidmaster123</code>
          </p>
        </div>
      </section>

      <section aria-label="Fitur utama">
        <h2 className="text-center text-2xl font-bold text-white">Semua yang dibutuhkan tim BD</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {tools.map((t, i) => (
            <Link key={t.t} to={t.to}
              className="anim-fade-up group bg-surface border border-white/10 rounded-2xl p-6 no-underline text-inherit shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:border-brand/50 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(229,72,77,0.15)] transition-all flex flex-col gap-3"
              style={{ animationDelay: `${i * 90}ms` }}>
              <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <t.Icon size={24} aria-hidden />
              </div>
              <h3 className="font-bold text-white">{t.t}</h3>
              <p className="text-sm text-slate-400 flex-1">{t.d}</p>
              <span className="text-brand font-semibold text-sm flex items-center gap-1">Mulai <ArrowRight size={14} aria-hidden /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-label="Cara kerja">
        <h2 className="text-center text-2xl font-bold text-white">Tiga langkah, satu draft siap review</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {steps.map(([t, d], i) => (
            <div key={t} className="anim-fade-up bg-surface border border-white/10 rounded-2xl p-6" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-9 h-9 avatar-grad text-white rounded-full font-extrabold flex items-center justify-center mb-3">{i + 1}</div>
              <h3 className="font-bold mb-1 text-white">{t}</h3>
              <p className="text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
