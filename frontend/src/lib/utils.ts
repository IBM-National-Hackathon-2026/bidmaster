import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export function token(): string {
  try {
    return (
      document.cookie.match(/(?:^|;\s*)bm_token=([^;]+)/)?.[1] ??
      sessionStorage.getItem("bm_token") ??
      ""
    );
  } catch {
    return "";
  }
}

export function authHeaders(extra: Record<string, string> = {}) {
  const t = token();
  return t ? { ...extra, Authorization: "Bearer " + t } : extra;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? "Gagal."), { status: r.status, data: j });
  return j;
}

/** Status mesin Langflow, di-dedupe: banyak komponen memakainya (Nav, Bob). */
let statusCache: Promise<boolean> | null = null;
export function agentStatus(force = false): Promise<boolean> {
  if (force) statusCache = null;
  statusCache ??= api<{ configured: boolean }>("/api/agent/status")
    .then((j) => j.configured)
    .catch(() => {
      statusCache = null; // gagal → boleh dicoba lagi
      return false;
    });
  return statusCache;
}
