import { Link } from "react-router-dom";
import { Button } from "../components/ui/controls";

const tools = [
  { to: "/app", icon: "📄", t: "Buat Draft Tender", d: "11 bab proposal + RAB per-komponen dari form, qty, dan dokumen KAK.", go: "Mulai buat draft →" },
  { to: "/app#hasil", icon: "🛡️", t: "Gate Korporat", d: "KAK terpetakan, total ≤ pagu, legalitas lengkap — BLOKIR berarti perbaiki.", go: "Lihat cara gate →" },
  { to: "/agent", icon: "🤖", t: "Bob Agent — AI", d: "Bahasa natural via Langflow: draft, revisi, PRD dalam satu flow.", go: "Bicara dengan Bob →" },
  { to: "/login", icon: "🔐", t: "Login & Audit Tim", d: "Sesi token 12 jam, peran, dan log audit setiap aksi.", go: "Masuk sekarang →" },
];

const steps = [
  ["Isi form & pilih komponen", "Instansi, pagu, durasi, lalu qty tiap komponen. Harga satuan terkunci katalog."],
  ["Tempel KAK & lengkapi legalitas", "Satu kebutuhan per baris; NIB/NPWP/akta wajib untuk tender."],
  ["Gate periksa, manusia setujui", "LOLOS + approve → export DOCX/PDF untuk panitia."],
];

export default function Landing() {
  return (
    <main className="max-w-6xl mx-auto px-6 pb-20">
      <section className="text-center pt-16 pb-10">
        <span className="inline-block bg-brand-light text-brand text-xs font-semibold px-3 py-1 rounded-full border border-red-200 mb-5">⚡ Alat internal Business Development</span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Draft tender selesai<br /><span className="text-brand">sebelum rapat berikutnya</span></h1>
        <p className="text-slate-500 mt-4 max-w-xl mx-auto">Form terstruktur. Harga dikunci katalog. Gate KAK, pagu, legalitas otomatis.</p>
        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          <Link to="/login"><Button size="lg">Masuk &amp; Mulai</Button></Link>
          <Link to="/app"><Button size="lg" variant="secondary">Lihat Alur Kerja</Button></Link>
        </div>
        <p className="text-xs text-slate-500 mt-3">Login demo: <code className="bg-slate-100 px-1.5 py-0.5 rounded">admin / bidmaster123</code></p>
      </section>
      <section aria-label="Fitur utama">
        <h2 className="text-center text-2xl font-bold">Semua yang dibutuhkan tim BD</h2>
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          {tools.map((t) => (
            <Link key={t.t} to={t.to} className="bg-white border-[1.5px] border-slate-200 rounded-2xl p-6 no-underline text-inherit shadow-sm hover:border-brand hover:-translate-y-0.5 transition-all flex flex-col gap-3">
              <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-2xl">{t.icon}</div>
              <h3 className="font-bold">{t.t}</h3>
              <p className="text-sm text-slate-500 flex-1">{t.d}</p>
              <span className="text-brand font-semibold text-sm">{t.go}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-12" aria-label="Cara kerja">
        <h2 className="text-center text-2xl font-bold">Tiga langkah, satu draft siap review</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {steps.map(([t, d], i) => (
            <div key={t} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="w-9 h-9 bg-brand text-white rounded-full font-extrabold flex items-center justify-center mb-3">{i + 1}</div>
              <h3 className="font-bold mb-1">{t}</h3>
              <p className="text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
