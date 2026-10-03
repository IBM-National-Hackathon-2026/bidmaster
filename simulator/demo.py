"""Demo CLI — simulasi panggilan Bob -> MCP tool generate_proposal_draft."""
from pathlib import Path
from simulator.proposal_engine import generate

BASE = Path(__file__).resolve().parent.parent
USER_TEXT = "Client kafe di Surabaya Timur, mau web + reservasi online, budget sekitar 10jt. Punya IG 8rb followers, reservasi masih via DM manual, belum punya website."

print("=" * 60)
print("SIMULASI: Bob memanggil generate_proposal_draft")
print("=" * 60)
print(f"User: {USER_TEXT}\n")

result = generate(USER_TEXT, client_file="kafe-arunika.md")
if "clarify" in result:
    print("Bot bertanya:", result["clarify"])
else:
    out = BASE / "outputs" / "proposal_v1.md"
    out.write_text(result["markdown"], encoding="utf-8")
    print(f"Compliance: {result['score']:.0f}%")
    for name, ok in result["checks"]:
        print(f"  [{'OK' if ok else 'FAIL'}] {name}")
    print(f"\nDraft tersimpan: {out}")
    print("\n--- PREVIEW (30 baris pertama) ---")
    preview = "\n".join(result["markdown"].splitlines()[:30])
    print(preview.encode("ascii", "ignore").decode())
