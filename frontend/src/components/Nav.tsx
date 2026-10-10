import { LogIn, LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const link = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium no-underline transition-colors ${
    isActive ? "text-slate-900 bg-slate-100 font-semibold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
  }`;

export function Nav() {
  const { user, ready, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-15">
        <Link to="/" className="font-extrabold text-xl flex items-center gap-2 no-underline text-slate-900" aria-label="BidMaster beranda">
          <span className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white text-sm">B</span>
          <span className="hidden xs:inline sm:inline">BidMaster</span>
        </Link>
        <nav className="flex gap-1 mx-auto" aria-label="Navigasi utama">
          <NavLink to="/" end className={link}>Beranda</NavLink>
          <NavLink to="/app" className={link}>Buat Draft</NavLink>
          <NavLink to="/agent" className={link}>Bob Agent</NavLink>
        </nav>
        {ready && user && <span className="text-xs text-slate-500 truncate max-w-32 sm:max-w-none">{user.nama} ({user.peran})</span>}
        {ready && (user ? (
          <button
            className="text-brand border-[1.5px] border-brand rounded-lg px-3.5 py-1.5 text-[0.83rem] font-semibold hover:bg-brand-light flex items-center gap-1.5"
            onClick={() => { logout().finally(() => nav("/login")); }}
          >
            <LogOut size={14} aria-hidden /> Keluar
          </button>
        ) : (
          <Link className="text-brand border-[1.5px] border-brand rounded-lg px-3.5 py-1.5 text-[0.83rem] font-semibold no-underline hover:bg-brand-light flex items-center gap-1.5" to="/login">
            <LogIn size={14} aria-hidden /> Masuk
          </Link>
        ))}
      </div>
    </header>
  );
}
