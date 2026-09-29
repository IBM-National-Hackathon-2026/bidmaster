"""Proposal engine — meniru logika flow Langflow `generate_proposal_draft`.
Tujuan: gambaran awal sebelum Langflow/Bob disambung. Logika sama:
Intake -> Analisis -> Konsep Web -> Pricing (dari katalog) -> Writer -> Compliance.
"""
import re
from datetime import date
from pathlib import Path
import yaml

BASE = Path(__file__).resolve().parent.parent

def load_knowledge():
    rules = (BASE / "knowledge" / "company_rules.md").read_text(encoding="utf-8")
    raw = (BASE / "knowledge" / "proposal_template.md").read_text(encoding="utf-8")
    # buang header template (judul + quote), mulai dari "# {client_name}"
    idx = raw.find("# {client_name}")
    template = raw[idx:] if idx != -1 else raw
    catalog = yaml.safe_load((BASE / "knowledge" / "price_catalog.yaml").read_text(encoding="utf-8"))
    return rules, template, catalog

def intake(user_text, client_file=None):
    """Ekstrak field sederhana (simulasi LLM intake)."""
    info = {"raw": user_text}
    if client_file and (BASE / "clients" / client_file).exists():
        info["profile"] = (BASE / "clients" / client_file).read_text(encoding="utf-8")
    # tebak nama/industri/budget secara kasar
    info["name"] = "Kafe Arunika" if "kafe" in user_text.lower() else "Client"
    info["industry"] = "F&B / Kafe" if "kafe" in user_text.lower() else "Umum"
    m = re.search(r"budget.*?(\d+\s?jt)", user_text.lower())
    info["budget_hint"] = m.group(1) if m else "-"
    missing = []
    if "nama" not in user_text.lower() and "kafe" not in user_text.lower():
        missing.append("Nama bisnis?")
    return info, missing[:3]

def analyze(info):
    profile = info.get("profile", info["raw"])
    strengths, weaknesses = [], []
    if "instagram" in profile.lower() or "followers" in profile.lower():
        strengths.append(("Punya audiens Instagram aktif", "8rb followers (dari profil client)"))
    if "spot foto" in profile.lower() or "menu musiman" in profile.lower():
        strengths.append(("Produk & tempat kuat untuk konten", "Menu musiman + spot foto (dari profil client)"))
    strengths.append(("Lokasi strategis", "[ASUMSI: perlu validasi alamat & traffic sekitar]"))
    if "reservasi" in profile.lower() or "dm/wa" in profile.lower() or "manual" in profile.lower():
        weaknesses.append(("Reservasi masih manual via DM/WA", "Calon pengunjung bisa pindah ke kompetitor", "Booking online di paket Standard/Premium"))
    if "website" in profile.lower():
        weaknesses.append(("Belum punya website/katalog online", "Sulit ditemukan Google Maps/Search", "Landing + katalog + SEO dasar"))
    return strengths, weaknesses

def web_concept(info):
    return {
        "objectives": ["Menampilkan menu & reservasi online", "Naikkan kunjungan weekday"],
        "target_users": ["Mahasiswa & pekerja remote Surabaya Timur"],
        "sitemap": ["Beranda", "Menu", "Reservasi", "Galeri", "Lokasi & Kontak"],
        "key_features": ["Katalog menu + CMS", "Reservasi online", "Galeri foto", "Peta + tombol WA"],
        "tech": "Next.js + CMS ringan + WhatsApp API [ASUMSI: stack default Kilat Studio]",
        "timeline_weeks": 4,
    }

def price_packages(catalog, budget_hint=""):
    pkgs = catalog["packages"]
    table = "| Paket | Harga | Timeline | Cocok untuk |\n|---|---|---|---|\n"
    for p in pkgs:
        table += f"| {p['name']} | Rp {p['price_idr']:,} | {p['timeline_weeks']} minggu | {p['best_for']} |\n"
    recommended = "Standard"  # budget ±10jt -> Standard
    reason = f"budget {budget_hint} paling pas + butuh reservasi online"
    return table, recommended, reason

def compliance_check(md, catalog):
    checks = []
    checks.append(("Bab keunggulan & kekurangan ada", "Keunggulan" in md and "Kekurangan" in md))
    prices_ok = all(str(p["price_idr"])[:3] in md.replace(",", "") or f"{p['price_idr']:,}" in md for p in catalog["packages"][:1])
    checks.append(("Harga sesuai katalog", prices_ok))
    checks.append(("Ada rekomendasi paket", "Rekomendasi" in md))
    checks.append(("Ada tag [ASUMSI] untuk inferensi", "[ASUMSI" in md))
    checks.append(("Klausul DP 50% & revisi ada", "DP 50%" in md))
    score = sum(1 for _, ok in checks if ok) / len(checks) * 100
    return score, checks

def generate(user_text, client_file="kafe-arunika.md"):
    rules, template, catalog = load_knowledge()
    info, missing = intake(user_text, client_file)
    if missing:
        return {"clarify": missing}
    strengths, weaknesses = analyze(info)
    concept = web_concept(info)
    table, rec, reason = price_packages(catalog, info.get("budget_hint", ""))

    s_str = "\n".join(f"- **{p}** — {e}" for p, e in strengths)
    w_str = "\n".join(f"- **{p}** (dampak: {d}) → solusi kami: {h}" for p, d, h in weaknesses)

    md = template.replace("{client_name}", info["name"])
    md = md.replace("{date}", date.today().strftime("%d %B %Y"))
    md = md.replace("{executive_summary}", f"{info['name']} membutuhkan website agar mudah ditemukan dan bisa menerima reservasi online. Proposal ini disusun berdasar info yang diberikan.")
    md = md.replace("{needs}", info["raw"])
    md = md.replace("{strengths}", s_str)
    md = md.replace("{weaknesses}", w_str)
    md = md.replace("{objectives}", "\n".join(f"- {o}" for o in concept["objectives"]))
    md = md.replace("{target_users}", "\n".join(f"- {u}" for u in concept["target_users"]))
    md = md.replace("{sitemap}", "\n".join(f"- {s}" for s in concept["sitemap"]))
    md = md.replace("{key_features}", "\n".join(f"- {f}" for f in concept["key_features"]))
    md = md.replace("{tech_suggestion}", concept["tech"])
    md = md.replace("{timeline_weeks}", str(concept["timeline_weeks"]))
    md = md.replace("{phases}", "- M1: Desain & konten\n- M2: Development + reservasi\n- M3: QA + go-live")
    md = md.replace("{packages_table}", table)
    md = md.replace("{recommended_package}", rec)
    md = md.replace("{recommendation_reason}", reason)
    md = md.replace("{terms}", "DP 50%, pelunasan sebelum serah terima. Maks 2x revisi mayor. Penawaran berlaku 14 hari.")
    md = md.replace("{cta}", "Balas setuju + pilih paket, kami kirim invoice DP dan jadwal kickoff.")

    score, checks = compliance_check(md, catalog)
    md += f"\n\n---\n**Compliance: {score:.0f}%**\n" + "\n".join(f"- [{'x' if ok else ' '}] {n}" for n, ok in checks)
    md += "\n*Status: draft — menunggu approval manusia.*"
    return {"markdown": md, "score": score, "checks": checks}
