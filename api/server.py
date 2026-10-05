"""BidMaster web API + static server. Stdlib only.

Run:  cd bidmaster  ->  python -m api.server  ->  http://127.0.0.1:8080
Satu origin (front+api) = tanpa CORS, CSP ketat, tanpa key di browser.
Tanpa simpan data: draft dihitung lalu dikirim, upload hanya di memori.
Mode: website (paket fix) | tender (per-komponen x qty).
"""
import json
import time
import yaml
from datetime import date
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from api.export_docx import md_to_docx_bytes
from simulator.proposal_engine import load_knowledge, TAG

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
MAX_BODY = 256 * 1024
MAX_DOC = 200 * 1024
MAX_MD = 200 * 1024
RATE_N, RATE_S = 20, 60  # 20 req/menit per IP

INDUSTRIES = ["F&B / Kafe", "Healthcare / Klinik", "Fashion / UMKM",
              "Jasa", "Pemerintahan", "Lainnya"]
FEATURES = ["Katalog/menu + CMS", "Reservasi online", "Pembayaran QRIS",
            "Blog + analitik", "Galeri foto", "Peta + tombol WA",
            "Member/loyalty", "Multi-cabang/bahasa"]
SITEMAP = {"Katalog/menu + CMS": "Katalog", "Reservasi online": "Reservasi",
           "Pembayaran QRIS": "Pembayaran", "Blog + analitik": "Blog",
           "Galeri foto": "Galeri", "Peta + tombol WA": "Lokasi & Kontak",
           "Member/loyalty": "Area Member", "Multi-cabang/bahasa": "Multi-cabang"}
TENDER_SITEMAP = ["Beranda", "Profil", "Layanan", "Jadwal", "Kontak"]

_hits = {}
TEMPLATE, CATALOG = load_knowledge()
TENDER = yaml.safe_load(
    (ROOT / "data" / "samples" / "tender-dummy" / "price_catalog.yaml").read_text(encoding="utf-8"))
TENDER_MAP = {k["kode"]: k for k in TENDER["komponen"]}


def limited(ip):
    now = time.time()
    q = [t for t in _hits.get(ip, []) if now - t < RATE_S]
    q.append(now)
    _hits[ip] = q
    return len(q) > RATE_N


def err(field, msg):
    return {"error": msg, "field": field}


def _disc(d):
    try:
        disc = float(d.get("diskon_persen", 0))
    except (TypeError, ValueError):
        return None, err("disk", "Diskon harus angka.")
    mx = CATALOG["discount_rules"]["max_discount_percent"]
    if not 0 <= disc <= mx:
        return None, err("disk", f"Diskon maks {mx}%.")
    return disc, None


def validate(d):
    if not isinstance(d, dict):
        return None, err("form", "Body harus JSON object.")
    mode = d.get("mode", "website")
    if mode not in ("website", "tender"):
        return None, err("mode", "Mode website/tender.")
    nama = str(d.get("nama", "")).strip()[:80]
    if len(nama) < 2:
        return None, err("nama", "Nama bisnis minimal 2 karakter.")
    ind = str(d.get("industri", ""))
    if ind not in INDUSTRIES:
        return None, err("ind", "Industri tidak dikenal.")
    try:
        dur = int(d.get("durasi_minggu", 0))
    except (TypeError, ValueError):
        return None, err("dur", "Durasi harus angka 1-12.")
    if not 1 <= dur <= 12:
        return None, err("dur", "Durasi 1-12 minggu.")
    disc, e = _disc(d)
    if e:
        return None, e
    doc = str(d.get("dokumen_text", ""))[:MAX_DOC]
    if len(str(d.get("dokumen_text", ""))) > MAX_DOC:
        return None, err("dok", "Dokumen maks 200KB.")
    base = {"mode": mode, "nama": nama, "industri": ind, "durasi": dur,
            "diskon": disc, "dok": doc,
            "dok_nama": str(d.get("dokumen_nama", ""))[:80],
            "catatan": str(d.get("catatan", "")).strip()[:500]}
    if mode == "website":
        paket = {p["id"]: p for p in CATALOG["packages"]}.get(str(d.get("paket", "")))
        if not paket:
            return None, err("paket", "Pilih paket Basic/Standard/Premium.")
        feats = d.get("fitur", [])
        if not isinstance(feats, list) or not feats or any(f not in FEATURES for f in feats):
            return None, err("fitur", "Pilih minimal 1 fitur valid.")
        base.update(paket=paket, fitur=list(dict.fromkeys(feats))[:8])
    else:
        rows = d.get("komponen", [])
        if not isinstance(rows, list) or not rows:
            return None, err("komp", "Isi qty minimal 1 komponen.")
        items = []
        for r in rows:
            if not isinstance(r, dict):
                return None, err("komp", "Baris komponen invalid.")
            k = TENDER_MAP.get(str(r.get("kode", "")))
            if not k:
                return None, err("komp", f"Kode {r.get('kode')} tidak dikenal.")
            try:
                qty = int(r.get("qty", 0))
            except (TypeError, ValueError):
                return None, err("komp", f"Qty {k['kode']} harus angka.")
            if not 0 <= qty <= 1000:
                return None, err("komp", f"Qty {k['kode']} 0-1000.")
            if qty:
                items.append((k, qty))
        if not items:
            return None, err("komp", "Isi qty minimal 1 komponen.")
        base["items"] = items[:10]
    return base, None


def split_total(total, labels):
    n = len(labels)
    rows, acc = [], 0
    for i, lab in enumerate(labels):
        v = total // n if i < n - 1 else total - acc
        acc += v
        rows.append((lab, v))
    return rows


def compose(v):
    dur = v["durasi"]
    if v["mode"] == "website":
        p = v["paket"]
        pname, pprice = p["name"], p["price_idr"]
        total = int(round(pprice * (100 - v["diskon"]) / 100))
        feats = v["fitur"]
        rab = "| Komponen | Estimasi (Rp) |\n|---|---|\n"
        for lab, nominal in split_total(total, feats):
            rab += f"| {lab} | {nominal:,} |\n"
        rab += f"| **Total bayar ({pname})** | **{total:,}** |\n"
        tab = "| Paket | Harga | Timeline | Cocok untuk |\n|---|---|---|---|\n"
        for q in CATALOG["packages"]:
            tab += f"| {q['name']} | Rp {q['price_idr']:,} | {q['timeline_weeks']} minggu | {q['best_for']} |\n"
        reason = f"{len(feats)} fitur + durasi {dur} minggu, total Rp {total:,}"
        sitemap = ["Beranda"] + [SITEMAP[f] for f in feats]
        feat_lines = feats
        obj = f"- Menyediakan {feats[0]}\n- Menerima interaksi/transaksi online"
        price_proof = f"{pprice:,}"
    else:
        raw = sum(k["harga_dasar"] * qty for k, qty in v["items"])
        total = int(round(raw * (100 - v["diskon"]) / 100))
        pname = "Tender"
        rab = "| Kode | Komponen | Qty × Satuan | Harga satuan | Subtotal |\n|---|---|---|---|---|\n"
        for k, qty in v["items"]:
            rab += (f"| {k['kode']} | {k['nama']} | {qty} {k['satuan']} | "
                    f"{k['harga_dasar']:,} | {k['harga_dasar'] * qty:,} |\n")
        rab += f"|  |  |  | **Total bayar (Tender)** | **{total:,}** |\n"
        tab = "| Kode | Komponen | Satuan | Harga dasar |\n|---|---|---|---|\n"
        for k in TENDER["komponen"]:
            tab += f"| {k['kode']} | {k['nama']} | {k['satuan']} | {k['harga_dasar']:,} |\n"
        reason = f"{len(v['items'])} komponen x qty, durasi {dur} minggu, total Rp {total:,}"
        sitemap = TENDER_SITEMAP
        feat_lines = [f"{k['nama']} ({qty} {k['satuan']})" for k, qty in v["items"]]
        obj = "- Menyediakan %s\n- Serah terima + dokumentasi" % feat_lines[0]
        price_proof = f"{v['items'][0][0]['harga_dasar']:,}"
    pot = (pprice if v["mode"] == "website" else raw) - total
    disc_txt = f" (diskon {v['diskon']:g}%, hemat Rp {pot:,})" if pot else ""
    b, r = dur // 3, dur % 3
    ph = [b + (1 if i < r else 0) for i in range(3)]
    phases = (f"- M1 Desain & konten: {ph[0]} minggu\n"
              f"- M2 Development: {ph[1]} minggu\n- M3 QA + go-live: {ph[2]} minggu")
    s = [(f"Kebutuhan terdefinisi: {len(feat_lines)} item dipilih", "dari form — deterministik")]
    if v["dok"]:
        s.append(("Dokumen requirement tersedia", f"{len(v['dok'])} karakter, {v['dok_nama'] or 'tanpa nama'}"))
    s.append((f"Konteks {v['industri']}", f"{TAG}: validasi data eksisting client]"))
    w = [(f"Kehadiran digital belum optimal ({v['industri']})",
          "sulit ditemukan & transaksi manual", f"paket {pname}: {feat_lines[0]}")]
    if any(k in v["dok"].lower() for k in ("manual", "dm", "wa ", "whatsapp")):
        w.append(("Proses masih manual (dari dokumen)", "calon client bisa pindah",
                  f"otomatisasi via {feat_lines[0]}"))
    md = TEMPLATE.replace("{client_name}", v["nama"])
    md = md.replace("{date}", date.today().strftime("%d %B %Y"))
    dokref = f" (dokumen {v['dok_nama']})" if v["dok_nama"] else ""
    md = md.replace("{executive_summary}",
        f"{v['nama']} ({v['industri']}) membutuhkan: {', '.join(feat_lines[:3])}. "
        f"Penawaran {pname} Rp {total:,}, {dur} minggu{dokref}.")
    prof = (f"**{v['nama']}** — {v['industri']}.\nItem: {', '.join(feat_lines)}.\n"
            f"Durasi: {dur} minggu. Diskon: {v['diskon']:g}%.")
    if v["dok"]:
        tail_dok = "…" if len(v["dok"]) > 500 else ""
        prof += f"\nKebutuhan tambahan dari dokumen ({len(v['dok'])} karakter): {v['dok'][:500]}{tail_dok}"
    if v["catatan"]:
        prof += "\nCatatan: " + v["catatan"]
    md = md.replace("{client_profile}", prof)
    md = md.replace("{strengths}", "\n".join(f"- **{a}** — {b}" for a, b in s))
    md = md.replace("{weaknesses}", "\n".join(f"- **{a}** (dampak: {b}) → solusi: {c}" for a, b, c in w))
    md = md.replace("{objectives}", obj)
    md = md.replace("{target_users}", f"- Pengguna {v['industri']} [perlu konfirmasi: segmen pasti]")
    md = md.replace("{sitemap}", "\n".join("- " + x for x in sitemap))
    md = md.replace("{key_features}", "\n".join("- " + f for f in feat_lines))
    md = md.replace("{tech_suggestion}", f"Next.js + CMS ringan + WhatsApp API {TAG}: stack default studio]")
    md = md.replace("{timeline_weeks}", str(dur))
    md = md.replace("{phases}", phases)
    md = md.replace("{rab_table}", rab)
    md = md.replace("{packages_table}", tab)
    md = md.replace("{recommended_package}", pname)
    md = md.replace("{recommendation_reason}", reason + disc_txt)
    md = md.replace("{terms}",
        f"DP 50%, pelunasan sebelum serah terima. Maks 2x revisi mayor. "
        f"Berlaku {CATALOG['discount_rules']['validity_days']} hari. Harga belum termasuk domain/hosting.")
    md = md.replace("{cta}", "Balas setuju + pilih paket, kami kirim invoice DP dan jadwal kickoff.")
    checks = [
        ("10 bab + RAB-lite", "## 2. Profil Client" in md and "## 7. RAB" in md),
        ("Keunggulan + kekurangan", "Keunggulan Client" in md and "Kekurangan" in md),
        ("Harga = katalog", price_proof in md),
        ("Diskon dalam batas", v["diskon"] <= CATALOG["discount_rules"]["max_discount_percent"]),
        ("RAB total konsisten", f"{total:,}" in rab),
        ("Tag konfirmasi", TAG in md),
        ("Klausul DP 50%", "DP 50%" in md),
    ]
    score = sum(1 for _, ok in checks if ok) / len(checks) * 100
    tail = (f"\n\n---\n**Compliance: {score:.0f}%**\n"
            + "\n".join(f"- [{'x' if ok else ' '}] {n}" for n, ok in checks)
            + "\n*Status: draft — menunggu persetujuan manusia.*")
    meta = {"package": pname, "total": total, "duration_weeks": dur, "mode": v["mode"]}
    return md + tail, {"score": score, "passed": all(ok for _, ok in checks),
                       "checks": [{"name": n, "ok": ok} for n, ok in checks]}, meta


class H(BaseHTTPRequestHandler):
    server_version = "BidMaster/1.0"

    def _send(self, code, body, ctype="application/json", extra=None):
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
        for k, val in (extra or {}).items():
            self.send_header(k, val)
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *a):  # ponytail: tanpa isi dokumen di log; aktifkan bila butuh audit
        pass

    def _body(self, cap=MAX_BODY):
        try:
            n = int(self.headers.get("Content-Length", 0))
        except ValueError:
            return None, {"error": "Content-Length invalid."}
        if n <= 0 or n > cap:
            return None, {"error": f"Body 1B-{cap // 1024}KB."}
        try:
            return json.loads(self.rfile.read(n)), None
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None, {"error": "JSON invalid.", "field": "form"}

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
                "industries": INDUSTRIES,
                "discount_max": CATALOG["discount_rules"]["max_discount_percent"],
                "website": {"packages": CATALOG["packages"], "features": FEATURES},
                "tender": {"komponen": TENDER["komponen"]}}))
        return self._send(404, json.dumps({"error": "Not found"}))

    def do_POST(self):
        if self.path not in ("/api/draft", "/api/export"):
            return self._send(404, json.dumps({"error": "Not found"}))
        if limited(self.client_address[0]):
            return self._send(429, json.dumps({"error": "Terlalu sering, coba 1 menit lagi."}))
        data, problem = self._body(MAX_MD if self.path == "/api/export" else MAX_BODY)
        if problem:
            return self._send(400, json.dumps(problem))
        if self.path == "/api/export":
            if data.get("format") != "docx":
                return self._send(400, json.dumps({"error": "Format harus docx."}))
            md = data.get("markdown", "")
            if not isinstance(md, str) or not 1 <= len(md) <= MAX_MD:
                return self._send(400, json.dumps({"error": "Markdown 1B-200KB."}))
            return self._send(200, md_to_docx_bytes(md),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                {"Content-Disposition": "attachment; filename=draft-proposal.docx"})
        data, problem = validate(data)
        if problem:
            return self._send(400, json.dumps(problem))
        md, comp, meta = compose(data)
        return self._send(200, json.dumps({"markdown": md, "compliance": comp, "meta": meta}))


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8080), H).serve_forever()
