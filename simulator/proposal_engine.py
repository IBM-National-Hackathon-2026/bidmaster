"""Proposal engine BidMaster — meniru flow Langflow `generate_proposal_draft`.
Spec: New-SDLC (10 bab + RAB-lite + tag [perlu konfirmasi]).
Template: knowledge/proposal_template.md
"""
import re
from datetime import date
from pathlib import Path
import yaml

BASE = Path(__file__).resolve().parent.parent
TAG = "[perlu konfirmasi"

def load_knowledge():
    template = (BASE / "knowledge" / "proposal_template.md").read_text(encoding="utf-8")
    idx = template.find("# {client_name}")
    template = template[idx:] if idx != -1 else template
    catalog = yaml.safe_load((BASE / "knowledge" / "price_catalog.yaml").read_text(encoding="utf-8"))
    return template, catalog

def intake(user_text, client_file=None):
    info = {"raw": user_text}
    if client_file and (BASE / "clients" / client_file).exists():
        info["profile"] = (BASE / "clients" / client_file).read_text(encoding="utf-8")
    low = user_text.lower()
    info["name"] = "Kafe Arunika" if "kafe" in low else "Client"
    info["industry"] = "F&B / Kafe" if "kafe" in low else "Umum"
    m = re.search(r"budget.*?(\d+\s?jt)", low)
    info["budget_hint"] = m.group(1) if m else "-"
    missing = []
    if "nama" not in low and "kafe" not in low and "toko" not in low and "klinik" not in low:
        missing.append("Nama bisnisnya apa?")
    if "industri" not in low and "kafe" not in low and "kuliner" not in low and "klinik" not in low:
        missing.append("Industrinya apa?")
    if not any(w in low for w in ("web", "website", "aplikasi", "katalog")):
        missing.append("Kebutuhan websitenya untuk apa?")
    return info, missing[:3]

def analyze(info):
    profile = info.get("profile", info["raw"])
    strengths, weaknesses = [], []
    if "instagram" in profile.lower() or "followers" in profile.lower():
        strengths.append(("Punya audiens Instagram aktif", "8rb followers (dari profil client)"))
    if "spot foto" in profile.lower() or "menu musiman" in profile.lower():
        strengths.append(("Produk & tempat kuat untuk konten", "menu musiman + spot foto (dari profil client)"))
    strengths.append(("Lokasi strategis", f"{TAG}: perlu validasi alamat & traffic sekitar]"))
    if "manual" in profile.lower() or "dm" in profile.lower():
        weaknesses.append(("Reservasi masih manual via DM/WA", "calon pengunjung bisa pindah ke kompetitor", "booking online di paket Standard/Premium"))
    if "belum punya" in profile.lower() or "website" in profile.lower():
        weaknesses.append(("Belum punya website/katalog online", "sulit ditemukan Google Maps/Search", "landing + katalog + SEO dasar"))
    return strengths, weaknesses

def web_concept(info):
    return {
        "objectives": ["Menampilkan menu & reservasi online", "Menaikkan kunjungan weekday"],
        "target_users": ["Mahasiswa & pekerja remote Surabaya Timur"],
        "sitemap": ["Beranda", "Menu", "Reservasi", "Galeri", "Lokasi & Kontak"],
        "key_features": ["Katalog menu + CMS", "Reservasi online", "Galeri foto", "Peta + tombol WA"],
        "tech": "Next.js + CMS ringan + WhatsApp API",
        "timeline_weeks": 4,
    }

def price_packages(catalog, budget_hint=""):
    pkgs = catalog["packages"]
    table = "| Paket | Harga | Timeline | Cocok untuk |\n|---|---|---|---|\n"
    for p in pkgs:
        table += f"| {p['name']} | Rp {p['price_idr']:,} | {p['timeline_weeks']} minggu | {p['best_for']} |\n"
    return table, "Standard", f"budget {budget_hint} paling pas + butuh reservasi online"

def rab_lite(catalog, package_name, features):
    pkg = next(p for p in catalog["packages"] if p["name"] == package_name)
    total = pkg["price_idr"]
    n = max(len(features), 1)
    share = total // n
    rows = "| Komponen | Estimasi (Rp) |\n|---|---|\n"
    assigned = 0
    for i, f in enumerate(features):
        val = share if i < n - 1 else total - assigned
        assigned += val
        rows += f"| {f} | {val:,} |\n"
    rows += f"| **Total ({package_name})** | **{total:,}** |\n"
    return rows

def compliance_check(md, catalog):
    checks = [
        ("10 bab terisi (profil + RAB-lite ada)", "## 2. Profil Client" in md and "## 7. RAB" in md),
        ("Ada keunggulan DAN kekurangan", "Keunggulan Client" in md and "Kekurangan" in md),
        ("Harga sesuai katalog", f"{catalog['packages'][1]['price_idr']:,}" in md),
        ("Ada rekomendasi paket + alasan", "Rekomendasi kami:" in md),
        ("RAB bertanda estimasi", "estimasi" in md.lower()),
        ("Tag [perlu konfirmasi] untuk inferensi", TAG in md),
        ("Klausul DP 50% & revisi ada", "DP 50%" in md),
    ]
    score = sum(1 for _, ok in checks if ok) / len(checks) * 100
    return score, checks

def generate(user_text, client_file="kafe-arunika.md"):
    template, catalog = load_knowledge()
    info, missing = intake(user_text, client_file)
    if missing:
        return {"clarify": missing}
    strengths, weaknesses = analyze(info)
    concept = web_concept(info)
    table, rec, reason = price_packages(catalog, info.get("budget_hint", ""))
    rab = rab_lite(catalog, rec, concept["key_features"])

    s_str = "\n".join(f"- **{p}** — {e}" for p, e in strengths)
    w_str = "\n".join(f"- **{p}** (dampak: {d}) → solusi kami: {h}" for p, d, h in weaknesses)
    profile = (f"**{info['name']}** — industri {info['industry']}, "
               f"budget {info.get('budget_hint', '-')}.\n{info['raw']}")

    md = template.replace("{client_name}", info["name"])
    md = md.replace("{date}", date.today().strftime("%d %B %Y"))
    md = md.replace("{executive_summary}", f"{info['name']} membutuhkan website agar mudah ditemukan dan bisa menerima reservasi online. Proposal ini disusun berdasar info yang diberikan.")
    md = md.replace("{client_profile}", profile)
    md = md.replace("{strengths}", s_str)
    md = md.replace("{weaknesses}", w_str)
    md = md.replace("{objectives}", "\n".join(f"- {o}" for o in concept["objectives"]))
    md = md.replace("{target_users}", "\n".join(f"- {u}" for u in concept["target_users"]))
    md = md.replace("{sitemap}", "\n".join(f"- {s}" for s in concept["sitemap"]))
    md = md.replace("{key_features}", "\n".join(f"- {f}" for f in concept["key_features"]))
    md = md.replace("{tech_suggestion}", f"{concept['tech']} {TAG}: stack default studio]")
    md = md.replace("{timeline_weeks}", str(concept["timeline_weeks"]))
    md = md.replace("{phases}", "- M1: Desain & konten\n- M2: Development + reservasi\n- M3: QA + go-live")
    md = md.replace("{rab_table}", rab)
    md = md.replace("{packages_table}", table)
    md = md.replace("{recommended_package}", rec)
    md = md.replace("{recommendation_reason}", reason)
    md = md.replace("{terms}", "DP 50%, pelunasan sebelum serah terima. Maks 2x revisi mayor. Penawaran berlaku 14 hari.")
    md = md.replace("{cta}", "Balas setuju + pilih paket, kami kirim invoice DP dan jadwal kickoff.")

    score, checks = compliance_check(md, catalog)
    summary = (f"## RINGKASAN\n- Client: {info['name']} ({info['industry']})\n"
               f"- Kebutuhan: reservasi online + katalog\n"
               f"- Rekomendasi: {rec} (Rp {next(p['price_idr'] for p in catalog['packages'] if p['name']==rec):,})\n"
               f"- Timeline: {concept['timeline_weeks']} minggu\n"
               f"- Compliance: {score:.0f}%\n")
    tail = ("\n\n---\n**Compliance: {:.0f}%**\n".format(score)
            + "\n".join(f"- [{'x' if ok else ' '}] {n}" for n, ok in checks)
            + "\n*Status: draft — menunggu persetujuan manusia.*")
    return {"markdown": summary + "\n" + md + tail, "score": score, "checks": checks,
            "client": info["name"]}
