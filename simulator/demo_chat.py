"""BidMaster UX demo — simulasi loop chat interface (06-INTERFACE.md Arg1).
Jalankan interaktif:  python -m simulator.demo_chat
Mode otomatis (test): python -m simulator.demo_chat --auto
"""
import re
import sys
from pathlib import Path
from simulator.proposal_engine import generate

BASE = Path(__file__).resolve().parent.parent
OUTDIR = BASE / "outputs"
OUTDIR.mkdir(exist_ok=True)

GREETING = ("Halo! Saya BidMaster. Kirim info client (nama, industri, kebutuhan, "
            "budget) dan saya susun draft proposalnya.")
AUTO_INPUT = ("Client kafe di Surabaya Timur, mau web + reservasi online, budget "
              "sekitar 10jt. Punya IG 8rb followers, reservasi masih via DM manual, "
              "belum punya website.")
AUTO_REVISIONS = ["Tambahkan fitur galeri menu di paket Standard"]


def slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "client"


def ask(prompt, auto_value=None):
    print(f"\nBidMaster: {prompt}")
    if auto_value is not None:
        print(f"User (auto): {auto_value}")
        return auto_value
    try:
        return input("User: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return "setuju"


def run_chat(auto=False):
    print(f"BidMaster: {GREETING}")
    if auto:
        print(f"User (auto): {AUTO_INPUT}")
        user_text = AUTO_INPUT
    else:
        try:
            user_text = input("User: ").strip()
        except (EOFError, KeyboardInterrupt):
            return
    if not user_text:
        print("BidMaster: Belum ada info. Sampai jumpa!")
        return

    version, rev_queue = 1, list(AUTO_REVISIONS) if auto else []
    notes = ""
    while True:
        print("BidMaster: Baik, saya panggil tool analisis + penyusunan...")
        res = generate(user_text + notes, client_file="kafe-arunika.md")
        if "clarify" in res:
            print("BidMaster: Sebelum saya susun, saya butuh:")
            answers = []
            for q in res["clarify"]:
                a = ask(q, "Kafe Arunika, F&B, web reservasi" if auto else None)
                answers.append(a)
            user_text += " " + " ".join(answers)
            continue
        fname = OUTDIR / f"{slug(res['client'])}-proposal-v{version}.md"
        fname.write_text(res["markdown"], encoding="utf-8")
        print(f"\nBidMaster: Draft v{version} selesai (compliance {res['score']:.0f}%).")
        print(f"BidMaster: Tersimpan di outputs/{fname.name}. Ringkasan + report ada di file.")
        print("BidMaster: Balas 'setuju' untuk finalkan, atau kirim instruksi revisi.")
        if auto:
            nxt = rev_queue.pop(0) if rev_queue else "setuju"
            print(f"User (auto): {nxt}")
        else:
            try:
                nxt = input("User: ").strip()
            except (EOFError, KeyboardInterrupt):
                nxt = "setuju"
        if nxt.lower() in ("setuju", "setuju, finalkan", "ok", "acc"):
            print(f"BidMaster: Disetujui. {fname.name} status approved. "
                  "Silakan kirim manual ke client. Terima kasih!")
            break
        notes += f" Revisi diminta: {nxt}."
        version += 1


if __name__ == "__main__":
    run_chat(auto="--auto" in sys.argv)
