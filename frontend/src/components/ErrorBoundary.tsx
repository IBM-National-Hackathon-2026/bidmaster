import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/controls";

type Props = { children: ReactNode };
type State = { err: Error | null };

/** Menangkap error render agar UI tidak menjadi layar kosong. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("UI error:", err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[60dvh] flex items-center justify-center p-6">
          <div className="bg-white border border-[#C9DDEE] rounded-2xl p-8 max-w-md w-full text-center shadow-[0_10px_36px_rgba(15,27,61,0.10)]">
            <div className="w-14 h-14 rounded-2xl grad-amber mx-auto flex items-center justify-center text-white text-2xl font-black">!</div>
            <h1 className="text-xl font-extrabold text-[#0F1B3D] mt-4">Terjadi kendala tampilan</h1>
            <p className="text-slate-600 text-sm mt-1">Muat ulang halaman. Bila masih gagal, hubungi admin.</p>
            <div className="mt-5 flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>Muat ulang</Button>
              <Button variant="secondary" onClick={() => { window.location.href = "/app"; }}>Ke beranda</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
