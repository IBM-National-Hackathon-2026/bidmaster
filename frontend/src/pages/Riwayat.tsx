import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card } from "../components/ui/controls";
import { ProposalApi } from "../lib/proposals";
import { T } from "../ui-text";
import { api, authHeaders } from "../lib/utils";

type Row = { id: number; instansi: string; status: string; updated_at?: string; dibuat_oleh: number; current_version: number };

export default function Riwayat() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState<number | null>(null);
  const [audit, setAudit] = useState<{ ts: number; aksi: string; detail: string }[]>([]);

  async function load() {
    try {
      setRows((await ProposalApi.list()).proposals);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }
  useEffect(() => { load(); }, []);

  async function hapus(id: number) {
    try {
      await ProposalApi.remove(id);
      setConfirm(null);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }

  async function lihatAudit() {
    try {
      setAudit((await api<{ audit: { ts: number; aksi: string; detail: string }[] }>("/api/audit", { headers: authHeaders() })).audit.slice(0, 30));
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 pb-24">
      <Card>
        <h1 className="font-bold text-xl text-white">{T.riwayat.judul}</h1>
        {err !== "" && <div className="mt-2" role="alert"><Alert kind="error">{err}</Alert></div>}
        {rows.length === 0 ? (
          <p className="text-base text-slate-300 mt-3">{T.riwayat.kosong}</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-2 pr-3">{T.riwayat.kolomTanggal}</th>
                <th className="py-2 pr-3">{T.riwayat.kolomInstansi}</th>
                <th className="py-2 pr-3">{T.riwayat.kolomStatus}</th>
                <th className="py-2">{T.riwayat.buka}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/10 text-slate-200">
                    <td className="py-2 pr-3 whitespace-nowrap">{r.updated_at ? new Date(r.updated_at).toLocaleString("id-ID") : "—"}</td>
                    <td className="py-2 pr-3">{r.instansi || "(tanpa nama)"}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2"><div className="flex gap-2">
                      <Link to={`/app/${r.id}`} className="text-brand font-semibold text-sm">{T.riwayat.buka}</Link>
                      <button onClick={() => setConfirm(r.id)} className="text-slate-400 text-sm hover:text-white">{T.riwayat.hapus}</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {confirm !== null && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
            <div role="dialog" aria-modal="true" className="bg-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <p className="text-base text-slate-100">{T.riwayat.hapusTanya}</p>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>{T.riwayat.batal}</Button>
                <Button size="sm" onClick={() => hapus(confirm)}>{T.riwayat.ya}</Button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={lihatAudit}>{T.riwayat.audit}</Button>
          {audit.map((a, i) => (
            <div key={i} className="text-xs text-slate-400 border-b border-white/5 py-1.5">
              {new Date(a.ts * 1000).toLocaleString("id-ID")} — {a.aksi} — {a.detail}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
