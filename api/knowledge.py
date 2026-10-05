"""Loader knowledge + fallback .example (pola .env.example).

Push publik hanya berisi knowledge/*.example (sanitasi, tanpa embel .md/.yaml
agar README satu-satunya *.md). Clone segar tetap jalan via fallback.
Adaptasi perusahaan: cp knowledge/tender_company.example knowledge/tender_company.md,
lalu edit. Token {...} di template WAJIB dipertahankan — dibaca composer.
"""
import yaml
from pathlib import Path

KN = Path(__file__).resolve().parent.parent / "knowledge"
TAG = "[perlu konfirmasi"


def read_kn(name):
    p = KN / name
    if p.exists():
        txt = p.read_text(encoding="utf-8")
    else:
        ex = KN / (name + ".example")
        if ex.exists():
            txt = ex.read_text(encoding="utf-8")
        else:
            # Push publik: knowledge/*.example tanpa embel .md/.yaml
            # (agar README satu-satunya *.md di repo).
            stem = name.rsplit(".", 1)[0] + ".example"
            txt = (KN / stem).read_text(encoding="utf-8")
    # Strip header sanitasi "# CONTOH ..." (sampai baris kosong pertama)
    # agar clone segar tidak bocorkan catatan internal ke draft final.
    if txt.lstrip().startswith("# CONTOH"):
        lines = txt.splitlines()
        for i, ln in enumerate(lines):
            if not ln.strip():
                return "\n".join(lines[i + 1:]).lstrip() + "\n"
        return txt
    return txt


def load_knowledge():
    template = read_kn("proposal_template.md")
    idx = template.find("# {client_name}")
    template = template[idx:] if idx != -1 else template
    catalog = yaml.safe_load(read_kn("price_catalog.yaml"))
    return template, catalog


def load_tender():
    tender = yaml.safe_load(read_kn("tender_price.yaml"))
    tmpl = read_kn("tender_template.md")
    company = read_kn("tender_company.md")
    team = yaml.safe_load(read_kn("tender_team.yaml"))
    return tender, tmpl, company, team
