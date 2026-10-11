import { CircleHelp, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { T } from "../ui-text";
import { agentStatus } from "../lib/utils";

const link = ({ isActive }: { isActive: boolean }) =>
  `px-3.5 py-2 rounded-xl text-sm font-semibold no-underline transition-all min-h-11 inline-flex items-center ${
    isActive ? "text-white bg-brand shadow-[0_4px_14px_rgba(15,27,61,0.25)]" : "text-slate-600 hover:text-[#0F1B3D] hover:bg-slate-100"
  }`;

function HowDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="cara-judul"
        className="bg-surface border border-slate-200 rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <h2 id="cara-judul" className="font-bold text-lg text-[#0F1B3D]">{T.app.caraKerjaJudul}</h2>
        <p className="text-base text-slate-700 mt-2">{T.app.caraKerjaIsi}</p>
        <div className="mt-4 text-right">
          <button onClick={onClose} autoFocus
            className="bg-brand text-white rounded-lg px-5 py-2.5 text-sm font-semibold min-h-11">{T.app.tutup}</button>
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const { user, ready, logout } = useAuth();
  const nav = useNavigate();
  const [how, setHow] = useState(false);
  const [engine, setEngine] = useState<boolean | null>(null);
  useEffect(() => {
    agentStatus().then((ok) => setEngine(ok));
  }, []);
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#C9DDEE]">
      <div className="h-0.5 grad-line" aria-hidden />
      <div className="max-w-6xl mx-auto flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 h-16">
        <Link to="/app" className="flex items-center no-underline shrink-0" aria-label="BidMaster AI beranda">
          <img src="/BidMaster-Ikon-1024.png" alt="BidMaster AI" className="h-8 w-auto sm:hidden" />
          <img src="/BidMaster-Logo.png" alt="BidMaster AI" className="h-9 w-auto hidden sm:block" />
        </Link>
        <nav className="flex gap-0.5 sm:gap-1 mx-auto overflow-x-auto max-w-full" aria-label="Navigasi utama">
          <NavLink to="/" end className={link}>Beranda</NavLink>
          <NavLink to="/app" className={link}>{T.nav.baru}</NavLink>
          <NavLink to="/riwayat" className={link}>{T.nav.riwayat}</NavLink>
        </nav>
        <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-600" role="status">
          <span className={`w-2 h-2 rounded-full ${engine ? "bg-green-400" : engine === false ? "bg-red-400" : "bg-slate-500"}`} />
          {engine === null ? "…" : engine ? T.nav.mesinOk : T.nav.mesinMati}
        </span>
        <button onClick={() => setHow(true)} aria-label={T.app.caraKerjaJudul}
          className="text-slate-600 hover:text-[#0F1B3D] p-2.5 min-w-11 min-h-11 rounded-lg hover:bg-slate-100">
          <CircleHelp size={18} aria-hidden />
        </button>
        {ready && (user ? (
          <button
            className="text-slate-700 border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold hover:bg-slate-100 flex items-center gap-1.5 min-h-11"
            onClick={() => { logout().finally(() => nav("/login")); }} aria-label={T.nav.keluar}>
            <LogOut size={15} aria-hidden />
            <span className="hidden sm:inline">{user.nama} · {T.nav.keluar}</span>
          </button>
        ) : (
          <Link className="text-brand border-[1.5px] border-brand/60 rounded-lg px-3.5 py-2 text-sm font-semibold no-underline hover:bg-brand-light flex items-center gap-1.5 min-h-11" to="/login">
            <LogIn size={15} aria-hidden /> {T.nav.masuk}
          </Link>
        ))}
      </div>
      {how && <HowDialog onClose={() => setHow(false)} />}
    </header>
  );
}
