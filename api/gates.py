"""Gate korporat: KAK coverage, pagu, legalitas. Murni fungsi, mudah diuji.

KAK coverage: tiap baris kebutuhan (dipisah baris/koma/titik-koma dari dokumen)
harus cocok minimal 1 komponen (kode/nama) atau kata kunci fitur.
Pagu: total <= pagu bila pagu diisi. Legalitas: NIB/NPWP/akta wajib terisi.
"""
import re

LEGAL_FIELDS = [("nib", "NIB"), ("npwp", "NPWP"), ("akta", "No. Akta pendirian")]

KAK_STOP = {"dan", "atau", "yang", "untuk", "dengan", "serta", "dari", "pada", "agar", "dapat", "sistem"}


def kak_items(dok):
    raw = re.split(r"[\n;]+", dok or "")
    out = []
    for chunk in raw:
        for part in chunk.split(","):
            p = part.strip(" -•\t.")
            if len(p) >= 8:
                out.append(p[:200])
    return out[:30]


def kak_coverage(items, komponen):
    uncovered, rows = [], []
    hay = " ".join(k["kode"] + " " + k["nama"] for k in komponen).lower()
    for it in items:
        words = [w for w in re.findall(r"[a-z]{4,}", it.lower()) if w not in KAK_STOP]
        hit = [w for w in words if w in hay]
        rows.append({"kebutuhan": it, "cocok": bool(hit), "kata": hit[:3]})
        if not hit:
            uncovered.append(it)
    return rows, uncovered


def legal_check(legal):
    missing = [label for key, label in LEGAL_FIELDS if not str(legal.get(key, "")).strip()]
    return missing


def gate(total, pagu, uncovered, missing_legal):
    blocks = []
    if pagu and total > pagu:
        blocks.append(f"Total Rp {total:,} melebihi pagu Rp {pagu:,} — turunkan qty/komponen.")
    if uncovered:
        blocks.append(f"{len(uncovered)} kebutuhan KAK tanpa komponen cocok — petakan manual.")
    if missing_legal:
        blocks.append("Legalitas kurang: %s." % ", ".join(missing_legal))
    return {"passed": not blocks, "blocks": blocks}
