import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/utils";

export function Nav() {
  const [who, setWho] = useState<{ nama: string; peran: string } | null>(null);
  const nav = useNavigate();
  useEffect(() => {
    api<{ nama: string; peran: string }>("/api/me").then(setWho).catch(() => setWho(null));
  }, []);
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-6 h-15">
        <Link to="/" className="font-extrabold text-xl flex items-center gap-2 no-underline text-slate-900">
          <span className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white text-sm">B</span>
          BidMaster
        </Link>
        <nav className="flex gap-1 mx-auto" aria-label="Navigasi utama">
          <Link className="text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium no-underline" to="/">Beranda</Link>
          <Link className="text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium no-underline" to="/app">Buat Draft</Link>
          <Link className="text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium no-underline" to="/agent">Bob Agent</Link>
        </nav>
        <span className="text-xs text-slate-500">{who ? `${who.nama} (${who.peran})` : ""}</span>
        {who ? (
          <button
            className="text-brand border-[1.5px] border-brand rounded-lg px-3.5 py-1.5 text-[0.83rem] font-semibold hover:bg-brand-light"
            onClick={() => {
              api("/api/logout", { method: "POST" }).catch(() => {});
              try { sessionStorage.removeItem("bm_token"); } catch {}
              document.cookie = "bm_token=; Path=/; Max-Age=0; SameSite=Strict";
              setWho(null);
              nav("/login");
            }}
          >
            Keluar
          </button>
        ) : (
          <Link className="text-brand border-[1.5px] border-brand rounded-lg px-3.5 py-1.5 text-[0.83rem] font-semibold no-underline hover:bg-brand-light" to="/login">Masuk</Link>
        )}
      </div>
    </header>
  );
}
