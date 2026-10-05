"""BidMaster web API + static server. Stdlib only (yaml via simulator engine).

Run:  cd bidmaster  ->  python -m api.server  ->  http://127.0.0.1:8080
Satu origin (front+api) = tanpa CORS, CSP ketat, tanpa key di browser.
Tanpa simpan data: draft dihitung lalu dikirim, upload hanya di memori.
"""
import json
import time
from datetime import date
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from simulator.proposal_engine import load_knowledge, TAG

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
MAX_BODY = 256 * 1024
MAX_DOC = 200 * 1024
RATE_N, RATE_S = 20, 60  # 20 req/menit per IP

INDUSTRIES = ["F&B / Kafe", "Healthcare / Klinik", "Fashion / UMKM", "Jasa", "Lainnya"]
FEATURES = ["Katalog/menu + CMS", "Reservasi online", "Pembayaran QRIS",
            "Blog + analitik", "Galeri foto", "Peta + tombol WA",
            "Member/loyalty", "Multi-cabang/bahasa"]
SITEMAP = {"Katalog/menu + CMS": "Katalog", "Reservasi online": "Reservasi",
           "Pembayaran QRIS": "Pembayaran", "Blog + analitik": "Blog",
           "Galeri foto": "Galeri", "Peta + tombol WA": "Lokasi & Kontak",
           "Member/loyalty": "Area Member", "Multi-cabang/bahasa": "Multi-cabang"}

_hits = {}
TEMPLATE, CATALOG = load_knowledge()


def limited(ip):
    now = time.time()
    q = [t for t in _hits.get(ip, []) if now - t < RATE_S]
    q.append(now)
    _hits[ip] = q
    return len(q) > RATE_N


def err(field, msg):
    return {"error": msg, "field": field}


def validate(d):
    if not isinstance(d, dict):
        return None, err("form", "Body harus JSON object.")
    nama = str(d.get("nama", "")).strip()[:80]
    if len(nama) < 2:
        return None, err("nama", "Nama bisnis minimal 2 karakter.")
    ind = str(d.get("industri", ""))
    if ind not in INDUSTRIES:
        return None, err("industri", "Industri tidak dikenal.")
    ids = {p["id"]: p for p in CATALOG["packages"]}
    paket = ids.get(str(d.get("paket", "")))
    if not paket:
        return None, err("paket", "Pilih paket Basic/Standard/Premium.")
    try:
        dur = int(d.get("durasi_minggu", 0))
    except (TypeError, ValueError):
        return None, err("durasi", "Durasi harus angka 1-12.")
    if not 1 <= dur <= 12:
        return None, err("durasi", "Durasi 1-12 minggu.")
    try:
        disc = float(d.get("diskon_persen", 0))
    except (TypeError, ValueError):
        return None, err("diskon", "Diskon harus angka 0-10.")
    if not 0 <= disc <= CATALOG["discount_rules"]["max_discount_percent"]:
        return None, err("diskon", f'Diskon maks {CATALOG["discount_rules"]["max_discount_percent"]}%.')
    feats = d.get("fitur", [])
    if not isinstance(feats, list) or not feats or any(f not in FEATURES for f in feats):
        return None, err("fitur", "Pilih minimal 1 fitur valid.")
    feats = list(dict.fromkeys(feats))[:8]
    doc = str(d.get("dokumen_text", ""))[:MAX_DOC]
    if len(str(d.get("dokumen_text", ""))) > MAX_DOC:
        return None, err("dokumen", "Dokumen maks 200KB.")
    cat = str(d.get("catatan", "")).strip()[:500]
    return {"nama": nama, "industri": ind, "paket": paket, "durasi": dur,
            "diskon": disc, "fitur": feats, "dok": doc,
            "dok_nama": str(d.get("dokumen_nama", ""))[:80], "catatan": cat}, None


def split_total(total, feats):
    n = len(feats)
    rows, acc = [], 0
    for i, f in enumerate(feats):
        v = total // n if i < n - 1 else total - acc
        acc += v
        rows.append((f, v))
    return rows


def compose(v):
    p, feats, dur = v["paket"], v["fitur"], v["durasi"]
    total = int(round(p["price_idr"] * (100 - v["diskon"]) / 100))
    pot = p["price_idr"] - total
    sitemap = ["Beranda"] + [SITEMAP[f] for f in feats]
    b, r = dur // 3, dur % 3
    ph = [b + (1 if i < r else 0) for i in range(3)]
    phases = (f"- M1 Desain & konten: {ph[0]} minggu\n"
              f"- M2 Development: {ph[1]} minggu\n- M3 QA + go-live: {ph[2]} minggu")
    rab = "| Komponen | Estimasi (Rp) |\n|---|---|\n"
    for f, nominal in split_total(total, feats):
        rab += f"| {f} | {nominal:,} |\n"
    rab += f"| **Total bayar ({p['name']})** | **{total:,}** |\n"
    s = [(f"Kebutuhan terdefinisi: {len(feats)} fitur dipilih", "dari form — deterministik")]
    if v["dok"]:
        s.append(("Dokumen requirement tersedia", f"{len(v['dok'])} karakter, {v['dok_nama'] or 'tanpa nama'}"))
    s.append((f"Konteks industri {v['industri']}", f"{TAG}: validasi data eksisting client]"))
    w = [(f"Kehadiran digital belum optimal ({v['industri']})",
          "sulit ditemukan & transaksi manual", f"paket {p['name']}: {feats[0]}")]
    low = v["dok"].lower()
    if any(k in low for k in ("manual", "dm", "wa ", "whatsapp")):
        w.append(("Proses masih manual (dari dokumen)", "calon client bisa pindah", f"otomatisasi via {feats[0]}"))
    md = TEMPLATE.replace("{client_name}", v["nama"])
    md = md.replace("{date}", date.today().strftime("%d %B %Y"))
    dokref = f" (dokumen {v['dok_nama']})" if v["dok_nama"] else ""
    md = md.replace("{executive_summary}",
        f"{v['nama']} ({v['industri']}) membutuhkan website: {', '.join(feats[:3])}. "
        f"Penawaran paket {p['name']} Rp {total:,}, {dur} minggu{dokref}.")
    prof = (f"**{v['nama']}** — {v['industri']}.\nFitur: {', '.join(feats)}.\n"
            f"Durasi: {dur} minggu. Diskon: {v['diskon']:g}%.")
    if v["dok"]:
        tail_dok = "…" if len(v["dok"]) > 500 else ""
        prof += f"\nKebutuhan tambahan dari dokumen ({len(v['dok'])} karakter): {v['dok'][:500]}{tail_dok}"
    if v["catatan"]:
        prof += "\nCatatan: " + v["catatan"]
    md = md.replace("{client_profile}", prof)
    md = md.replace("{strengths}", "\n".join(f"- **{a}** — {b}" for a, b in s))
    md = md.replace("{weaknesses}", "\n".join(f"- **{a}** (dampak: {b}) → solusi: {c}" for a, b, c in w))
    md = md.replace("{objectives}", f"- Menyediakan {feats[0]}\n- Menerima interaksi/transaksi online")
    md = md.replace("{target_users}", f"- Pengunjung {v['industri']} [perlu konfirmasi: segmen pasti]")
    md = md.replace("{sitemap}", "\n".join("- " + x for x in sitemap))
    md = md.replace("{key_features}", "\n".join("- " + f for f in feats))
    md = md.replace("{tech_suggestion}", f"Next.js + CMS ringan + WhatsApp API {TAG}: stack default studio]")
    md = md.replace("{timeline_weeks}", str(dur))
    md = md.replace("{phases}", phases)
    md = md.replace("{rab_table}", rab)
    tab = "| Paket | Harga | Timeline | Cocok untuk |\n|---|---|---|---|\n"
    for q in CATALOG["packages"]:
        tab += f"| {q['name']} | Rp {q['price_idr']:,} | {q['timeline_weeks']} minggu | {q['best_for']} |\n"
    md = md.replace("{packages_table}", tab)
    md = md.replace("{recommended_package}", p["name"])
    disc_txt = f" (diskon {v['diskon']:g}%, hemat Rp {pot:,})" if pot else ""
    md = md.replace("{recommendation_reason}",
        f"{len(feats)} fitur + durasi {dur} minggu, total Rp {total:,}{disc_txt}")
    md = md.replace("{terms}",
        f"DP 50%, pelunasan sebelum serah terima. Maks 2x revisi mayor. "
        f"Berlaku {CATALOG['discount_rules']['validity_days']} hari. Harga belum termasuk domain/hosting.")
    md = md.replace("{cta}", "Balas setuju + pilih paket, kami kirim invoice DP dan jadwal kickoff.")
    checks = [
        ("10 bab + RAB-lite", "## 2. Profil Client" in md and "## 7. RAB" in md),
        ("Keunggulan + kekurangan", "Keunggulan Client" in md and "Kekurangan" in md),
        ("Harga = katalog", f"{p['price_idr']:,}" in md),
        ("Diskon dalam batas", v["diskon"] <= CATALOG["discount_rules"]["max_discount_percent"]),
        ("RAB total konsisten", f"{total:,}" in rab),
        ("Tag konfirmasi", TAG in md),
        ("Klausul DP 50%", "DP 50%" in md),
    ]
    score = sum(1 for _, ok in checks if ok) / len(checks) * 100
    tail = (f"\n\n---\n**Compliance: {score:.0f}%**\n"
            + "\n".join(f"- [{'x' if ok else ' '}] {n}" for n, ok in checks)
            + "\n*Status: draft — menunggu persetujuan manusia.*")
    meta = {"package": p["name"], "price": p["price_idr"], "discount": v["diskon"],
            "total": total, "duration_weeks": dur}
    return md + tail, {"score": score, "passed": all(ok for _, ok in checks),
                       "checks": [{"name": n, "ok": ok} for n, ok in checks]}, meta


class H(BaseHTTPRequestHandler):
    server_version = "BidMaster/1.0"

    def _send(self, code, body, ctype="application/json"):
        raw = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Content-Security-Policy",
            "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *a):  # ponytail: tanpa isi dokumen di log; aktifkan bila butuh audit
        pass

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            return self._send(200, (WEB / "index.html").read_bytes(), "text/html")
        if self.path in ("/app.js", "/styles.css"):
            ct = "text/javascript" if self.path.endswith(".js") else "text/css"
            return self._send(200, (WEB / self.path[1:]).read_bytes(), ct)
        if self.path == "/api/health":
            return self._send(200, json.dumps({"ok": True}))
        if self.path == "/api/catalog":
            return self._send(200, json.dumps({
                "packages": CATALOG["packages"], "discount_rules": CATALOG["discount_rules"],
                "industries": INDUSTRIES, "features": FEATURES}))
        return self._send(404, json.dumps({"error": "Not found"}))

    def do_POST(self):
        if self.path != "/api/draft":
            return self._send(404, json.dumps({"error": "Not found"}))
        if limited(self.client_address[0]):
            return self._send(429, json.dumps({"error": "Terlalu sering, coba 1 menit lagi."}))
        try:
            n = int(self.headers.get("Content-Length", 0))
        except ValueError:
            return self._send(400, json.dumps({"error": "Content-Length invalid."}))
        if n <= 0 or n > MAX_BODY:
            return self._send(413, json.dumps({"error": "Body 1B-256KB."}))
        try:
            data, problem = validate(json.loads(self.rfile.read(n)))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self._send(400, json.dumps({"error": "JSON invalid.", "field": "form"}))
        if problem:
            return self._send(400, json.dumps(problem))
        md, comp, meta = compose(data)
        return self._send(200, json.dumps({"markdown": md, "compliance": comp, "meta": meta}))


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8080), H).serve_forever()
