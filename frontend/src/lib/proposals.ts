import { api, authHeaders } from "./utils";

export type Item = {
  id: string; kategori: string; requirement: string; kutipan: string;
  sumber_klien: { baris?: number; halaman?: number; paragraf?: number } | null;
  sumber_knowledge: string[]; status: "sesuai" | "sebagian" | "berisiko";
  alasan: string; keyakinan: "tinggi" | "sedang" | "rendah";
  komponen_usulan: { kode: string; qty: number }[];
  perlu_konfirmasi: boolean;
};

export type Decision = {
  putusan: string; status_awal: string; status_akhir: string; alasan: string;
  catatan: string; pertanyaan: string; oleh?: string; pada?: string;
};

export type Proposal = {
  id: number; instansi: string; jenis_instansi: string; pagu: number | null;
  durasi_minggu: number; req_nama: string; req_satuan: string; req_jumlah: number;
  req_teks: string; pendukung: { nama: string; satuan: string; jumlah: number }[];
  items: Item[]; decisions: Record<string, Decision>; approvals: unknown[];
  status: string; current_version: number; updated_at?: string;
};

const J = { "Content-Type": "application/json" };

export const ProposalApi = {
  create: (b: object) => api<{ proposal: Proposal }>("/api/proposals", {
    method: "POST", headers: authHeaders(J), body: JSON.stringify(b) }),
  get: (id: number) => api<{ proposal: Proposal }>(`/api/proposals/${id}`, { headers: authHeaders() }),
  patch: (id: number, b: object) => api<{ proposal: Proposal; tersimpan_pukul: string }>(`/api/proposals/${id}`, {
    method: "PATCH", headers: authHeaders(J), body: JSON.stringify(b) }),
  remove: (id: number) => api<{ ok: boolean }>(`/api/proposals/${id}`, {
    method: "DELETE", headers: authHeaders() }),
  list: () => api<{ proposals: { id: number; instansi: string; status: string; updated_at?: string; dibuat_oleh: number; current_version: number }[] }>("/api/proposals", { headers: authHeaders() }),
  upload: (id: number, file: File, kind: string) => {
    const f = new FormData();
    f.append("file", file);
    f.append("kind", kind);
    return api<{ proposal: Proposal; file: { nama: string; satuan: string; jumlah: number; status: string } }>(
      `/api/proposals/${id}/upload`, { method: "POST", headers: authHeaders(), body: f });
  },
  analyze: (id: number, fallback = false) => api<{ proposal: Proposal; ringkasan: { butir: number; valid: number; perlu_konfirmasi: number; waktu_detik: number; fallback?: boolean } }>(
    `/api/proposals/${id}/analyze`, { method: "POST", headers: authHeaders(J), body: JSON.stringify({ fallback }) }),
  deleteFile: (id: number, kind: "requirement" | "pendukung", index?: number) => {
    const q = new URLSearchParams({ kind });
    if (index !== undefined) q.set("index", String(index));
    return api<{ proposal: Proposal; ok: boolean }>(`/api/proposals/${id}/file?${q.toString()}`, {
      method: "DELETE", headers: authHeaders() });
  },
  company: () => api<{ nama_resmi: string; nama_singkat: string; tagline: string }>("/api/company"),
};
