import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { T } from "../ui-text";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-[#C9DDEE] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <img src="/BidMaster-Logo.png" alt="BidMaster AI" className="h-9 w-auto" />
          <p className="text-sm text-slate-600 mt-3 max-w-sm">{T.app.pita}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
            <ShieldCheck size={14} aria-hidden /> Human-in-the-loop · setiap keputusan oleh manusia
          </div>
        </div>

        <nav aria-label="Tautan produk" className="text-sm">
          <h3 className="font-bold text-[#0F1B3D] mb-3">Produk</h3>
          <ul className="space-y-2">
            <li><Link to="/" className="text-slate-600 hover:text-brand no-underline">Beranda</Link></li>
            <li><Link to="/app" className="text-slate-600 hover:text-brand no-underline">{T.nav.baru}</Link></li>
            <li><Link to="/riwayat" className="text-slate-600 hover:text-brand no-underline">{T.nav.riwayat}</Link></li>
            <li><Link to="/login" className="text-slate-600 hover:text-brand no-underline">{T.nav.masuk}</Link></li>
          </ul>
        </nav>

        <div className="text-sm">
          <h3 className="font-bold text-[#0F1B3D] mb-3">Perusahaan</h3>
          <p className="text-slate-600">PT Solusi Teknologi Nusantara (NusaTech)</p>
          <p className="text-slate-500 mt-2 text-xs">Alat internal pre-sales. Semua aktivitas tercatat di jejak audit.</p>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© 2026 PT Solusi Teknologi Nusantara (NusaTech). Seluruh hak dilindungi.</span>
          <span>BidMaster AI · draft → gate → persetujuan manusia</span>
        </div>
      </div>
    </footer>
  );
}
