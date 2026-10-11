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
  const [vers, setVers] = useState<Record<number, { versi: number }[]>>({});
  const [openV, setOpenV] = useState<number | null>(null);

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

  async function toggleVersi(id: number) {
    if (openV === id) {
      setOpenV(null);
      return;
    }
    try {
      const j = await api<{ versions: { versi: number }[] }>(`/api/proposals/${id}/versions`, { headers: authHeaders() });
      setVers((m) => ({ ...m, [id]: j.versions }));
      setOpenV(id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : T.umum.cobaLagi);
    }
  }

  async function unduhVersi(id: number, v: number, format: string) {
    const r = await fetch(`/api/proposals/${id}/versions/${v}/file?format=${format}`, { headers: authHeaders() });
    if (!r.ok) return setErr(T.umum.cobaLagi);
    const nama = (r.headers.get("Content-Disposition") ?? "").match(/filename="(.+?)"/)?.[1] ?? `proposal-v${v}.${format}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = nama;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 pb-24">
      <Card>
        <h1 className="font-bold text-xl text-[#0F1B3D]">{T.riwayat.judul}</h1>
        {err !== "" && <div className="mt-2" role="alert"><Alert kind="error">{err}</Alert></div>}
        {rows.length === 0 ? (
          <p className="text-base text-slate-600 mt-3">{T.riwayat.kosong}</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="text-left text-xs uppercase text-slate-600 bg-[#EEF0F8]">
                <th className="py-2 pr-3">{T.riwayat.kolomTanggal}</th>
                <th className="py-2 pr-3">{T.riwayat.kolomInstansi}</th>
                <th className="py-2 pr-3">{T.riwayat.kolomStatus}</th>
                <th className="py-2">{T.riwayat.buka}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 text-slate-700">
                    <td className="py-2 pr-3 whitespace-nowrap">{r.updated_at ? new Date(r.updated_at).toLocaleString("id-ID") : "—"}</td>
                    <td className="py-2 pr-3">{r.instansi || "(tanpa nama)"}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2"><div className="flex gap-2 flex-wrap">
                      <Link to={`/app/${r.id}`} className="text-brand font-semibold text-sm">{T.riwayat.buka}</Link>
                      <button onClick={() => toggleVersi(r.id)} className="text-slate-600 text-sm hover:text-[#0F1B3D]">
                        {T.harga.versi} ({(vers[r.id] ?? []).length || r.current_version || 0})</button>
                      <button onClick={() => setConfirm(r.id)} className="text-slate-600 text-sm hover:text-[#0F1B3D]">{T.riwayat.hapus}</button>
                    </div>
                    {openV === r.id && (
                      <div className="text-xs text-slate-600 mt-1">
                        {(vers[r.id] ?? []).map((v) => (
                          <span key={v.versi} className="mr-2">v{v.versi}
                            <button onClick={() => unduhVersi(r.id, v.versi, "docx")} className="text-brand underline ml-1">.docx</button>
                            <button onClick={() => unduhVersi(r.id, v.versi, "md")} className="text-brand underline ml-1">.md</button>
                          </span>
                        ))}
                        {(vers[r.id] ?? []).length === 0 && <span className="text-slate-600">—</span>}
                      </div>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {confirm !== null && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
            <div role="dialog" aria-modal="true" className="bg-surface border border-slate-200 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <p className="text-base text-slate-800">{T.riwayat.hapusTanya}</p>
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
            <div key={i} className="text-xs text-slate-600 border-b border-slate-200 py-1.5">
              {new Date(a.ts * 1000).toLocaleString("id-ID")} — {a.aksi} — {a.detail}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
