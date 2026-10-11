import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Alert, Button, Card, Input, Label } from "../components/ui/controls";
import { T } from "../ui-text";

export default function Login() {
  const nav = useNavigate();
  const { login, user, ready } = useAuth();
  const [nama, setNama] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && user) nav("/app"); }, [ready, user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (nama.trim().length < 2 || pw === "") return setErr(T.auth.kosong);
    setBusy(true);
    try {
      await login(nama.trim(), pw);
      nav("/app");
    } catch (e) {
      const s = (e as { status?: number }).status;
      setErr(s === 401 ? T.auth.salah : T.auth.jaringan);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <Card className="anim-fade-up w-full max-w-md p-8">
        <img src="/BidMaster-Logo.png" alt="BidMaster AI" className="h-11 w-auto mb-5" />
        <h1 className="text-2xl font-extrabold text-[#0F1B3D]">{T.auth.judul}</h1>
        <p className="text-base text-slate-600 mt-1 mb-5">{T.auth.sub}</p>
        <form onSubmit={submit} noValidate>
          <Label htmlFor="user">{T.auth.nama}</Label>
          <Input id="user" autoFocus autoComplete="username" placeholder="nama.pengguna"
            value={nama} onChange={(e) => setNama(e.target.value)}
            aria-invalid={err !== "" && nama.trim().length < 2} />
          <Label htmlFor="pw">{T.auth.sandi}</Label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} autoComplete="current-password"
              value={pw} onChange={(e) => setPw(e.target.value)}
              aria-invalid={err !== "" && pw === ""} className="pr-12" />
            <button type="button" onClick={() => setShow(!show)}
              aria-label={show ? T.auth.sembunyi : T.auth.lihat} aria-pressed={show}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 min-w-11 min-h-11 text-slate-600 hover:text-[#0F1B3D] rounded-lg">
              {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
          {err !== "" && <div className="mt-3" role="alert"><Alert kind="error">{err}</Alert></div>}
          <div className="grid mt-5">
            <Button type="submit" disabled={busy}>{busy ? T.auth.memeriksa : T.auth.tombol}</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
