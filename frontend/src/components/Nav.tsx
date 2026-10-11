import { CircleHelp, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { T } from "../ui-text";
import { api } from "../lib/utils";

const link = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium no-underline transition-colors min-h-11 inline-flex items-center ${
    isActive ? "text-white bg-white/10 font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"
  }`;

function HowDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="cara-judul"
        className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}>
        <h2 id="cara-judul" className="font-bold text-lg text-white">{T.app.caraKerjaJudul}</h2>
        <p className="text-base text-slate-200 mt-2">{T.app.caraKerjaIsi}</p>
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
    api<{ configured: boolean }>("/api/agent/status")
      .then((j) => setEngine(j.configured)).catch(() => setEngine(false));
  }, []);
  return (
    <header className="sticky top-0 z-50 bg-night/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto flex items-center gap-2 px-4 sm:px-6 h-16">
        <Link to="/app" className="flex items-center no-underline shrink-0" aria-label="BidMaster AI beranda">
          <img src="/BidMaster-Logo.png" alt="BidMaster AI" className="h-9 w-auto" />
        </Link>
        <nav className="flex gap-1 mx-auto" aria-label="Navigasi utama">
          <NavLink to="/app" className={link}>{T.nav.baru}</NavLink>
          <NavLink to="/riwayat" className={link}>{T.nav.riwayat}</NavLink>
        </nav>
        <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400" role="status">
          <span className={`w-2 h-2 rounded-full ${engine ? "bg-green-400" : engine === false ? "bg-red-400" : "bg-slate-500"}`} />
          {engine === null ? "…" : engine ? T.nav.mesinOk : T.nav.mesinMati}
        </span>
        <button onClick={() => setHow(true)} aria-label={T.app.caraKerjaJudul}
          className="text-slate-300 hover:text-white p-2.5 min-w-11 min-h-11 rounded-lg hover:bg-white/5">
          <CircleHelp size={18} aria-hidden />
        </button>
        {ready && (user ? (
          <button
            className="text-slate-200 border border-white/20 rounded-lg px-3.5 py-2 text-sm font-semibold hover:bg-white/5 flex items-center gap-1.5 min-h-11"
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
