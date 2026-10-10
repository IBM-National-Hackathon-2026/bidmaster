import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Alert, Button, Card, Input, Label } from "../components/ui/controls";

export default function Login() {
  const nav = useNavigate();
  const { login, user, ready } = useAuth();
  useEffect(() => { if (ready && user) nav("/app"); }, [ready, user, nav]);
  const [nama, setNama] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (nama.trim().length < 2) return setErr("Nama pengguna minimal 2 karakter.");
    if (pw.length < 4) return setErr("Kata sandi minimal 4 karakter.");
    setBusy(true);
    try {
      await login(nama.trim(), pw);
      nav("/app");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-60px)] grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center bg-brand text-white p-12" aria-hidden="true">
        <div className="max-w-sm">
          <h2 className="text-3xl font-extrabold mb-3">Satu alat untuk semua kebutuhan tender</h2>
          <p className="opacity-85 text-[0.95rem]">Draft 11 bab + RAB dari form, harga terkunci katalog, gate otomatis, audit tercatat.</p>
          <ul className="mt-7 space-y-3 text-sm opacity-90 list-none">
            {["Gate KAK, pagu, dan legalitas otomatis", "Export DOCX siap kirim setelah disetujui", "Chat agent via Langflow"].map((f) => (
              <li key={f} className="flex gap-2.5"><span className="font-bold">✓</span>{f}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-9">
          <h1 className="text-2xl font-extrabold">Masuk ke tim</h1>
          <p className="text-sm text-slate-500 mt-1 mb-4">Akses internal. Semua aktivitas dicatat di audit.</p>
          <form onSubmit={submit} noValidate>
            <Label htmlFor="user">Nama pengguna</Label>
            <Input id="user" autoComplete="username" placeholder="admin" value={nama}
              onChange={(e) => setNama(e.target.value)} aria-invalid={err !== "" && nama.trim().length < 2} />
            <Label htmlFor="pw">Kata sandi</Label>
            <Input id="pw" type="password" autoComplete="current-password" value={pw}
              onChange={(e) => setPw(e.target.value)} aria-invalid={err !== "" && pw.length < 4} />
            {err !== "" && <div className="mt-3"><Alert kind="error">{err}</Alert></div>}
            <div className="grid mt-4"><Button type="submit" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</Button></div>
          </form>
          <p className="text-center text-xs text-slate-500 mt-4">Sesi 12 jam · Seed: <code className="bg-slate-100 px-1 rounded">admin / bidmaster123</code></p>
        </Card>
      </div>
    </main>
  );
}
