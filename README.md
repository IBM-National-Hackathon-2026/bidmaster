# BidMaster ⚡

**Satu AI agent multi-skill untuk membuat proposal client dalam hitungan menit — langsung dari chat.**

> Hackathon 2026 hacktive (Nasional, Hacktiv8 x IBM) · Tema: **Productivity & Smart Business**
> Tech wajib: **IBM Bob** (interaksi) + **Langflow** (eksekusi) via **MCP**.

Sales sedang hunting client → client tiba-tiba minta proposal → kirim info singkat ke **Bob**
→ Bob memanggil MCP tool Langflow → draft proposal lengkap
(keunggulan + kekurangan client, konsep website, pilihan paket harga) kembali dalam **< 90 detik**.

---

## Arsitektur

```
User ──► IBM Bob ──► MCP ──► Langflow Project ──► LLM (Gemini)
            │                     │
       pilih tool          generate_proposal_draft
       jelaskan hasil      revise_proposal
                           generate_prd_from_brief
```

Prinsip: *logika workflow di Langflow, logika percakapan di Bob.*
Satu Bob, banyak tools — skill baru = 1 flow Langflow + expose MCP, tanpa tulis ulang sistem.

| MCP Tool | Fungsi | Status |
|---|---|---|
| `generate_proposal_draft` | Draft proposal 9 bab + compliance check | MVP ✅ |
| `revise_proposal` | Revisi iteratif + tolak diskon >10% sopan | MVP ✅ |
| `generate_prd_from_brief` | PRD dari brief/proposal | MVP kedua ✅ |

---

## Struktur Repo

```
bidmaster/
├── README.md  .gitignore  .env.example  requirements.txt
├── knowledge/      company_rules.md, proposal_template.md, price_catalog.yaml
├── clients/        3 profil client DUMMY (kafe, klinik, batik)
├── skills/         registry.yaml (daftar MCP tools)
├── langflow/
│   ├── flows/      3 file JSON siap import + IMPORT_GUIDE.md
│   └── mcp.json.example   (contoh config, TANPA secret)
├── simulator/      tiruan flow untuk demo lokal tanpa server
├── output/         hasil draft simulasi (di-ignore git)
├── gateway/        stub ekstensi Telegram (P2)
├── evals/  docs/ (bob-log.md)  scripts/
```

Dokumen SDLC lengkap (PRD, arsitektur, skill, workflow, TODO) ada di `../SDLC/`.

---

## Cara Menjalankan

### 0. Simulasi lokal (tanpa Langflow/Bob — 1 menit)

```
cd bidmaster
pip install -r requirements.txt
python -m simulator.demo
```

Output: draft proposal + skor compliance di terminal, file di `output/proposal_v1.md`.

### 1. Langflow — Build & Expose

1. Install Langflow, buat Project baru.
2. Model: `aistudio.google.com/api-keys` → Settings → Model Providers → Save.
3. Import `langflow/flows/*.json` (drag-drop / Upload a flow) — detail di `langflow/IMPORT_GUIDE.md`.
4. Per flow: klik **Agent** → pilih model `gemini-2.5-flash` + isi API key → uji di **Playground**.
5. **MCP Server → JSON → Generate API Key** → salin JSON + key (key muncul 1x, simpan di luar repo!).

### 2. Bob — Connect & Call

1. Download + login (`bob.ibm.com`), buka folder ini sebagai workspace.
2. **Gear → MCP → +** → tempel JSON Langflow (gunakan path absolut `uvx` bila IDE tidak menemukan `uvx` di PATH).
3. Verifikasi 3 tools ter-discover, uji prompt natural:
   * *"buatkan draft proposal untuk kafe di Surabaya Timur, mau web + reservasi, budget 10jt"*
   * *"tambahkan fitur galeri menu di paket Standard"* → `revise_proposal`
   * *"buatkan PRD untuk website tadi"* → `generate_prd_from_brief`

### 3. Demo 3–5 menit

Masalah → live proposal di Bob → revisi → approve → pindah ke PRD → tunjukkan canvas Langflow + MCP → tutup (dampak + monetisasi + responsible AI).
Cadangan: rekaman video + 3–5 screenshot bila live demo gagal.

---

## Knowledge ("pelatihan" agent)

| File | Isi |
|---|---|
| `knowledge/company_rules.md` | Tone, struktur wajib, klausul, batas diskon 10% |
| `knowledge/proposal_template.md` | 9 bab proposal |
| `knowledge/price_catalog.yaml` | **Satu-satunya sumber harga** (Basic 5jt / Standard 10jt / Premium 18jt) |
| `clients/*.md` | Profil client dummy |

Aturan: harga tidak boleh dikarang model, inferensi wajib tag `[ASUMSI]`,
dokumen `draft` sampai disetujui manusia (approval gate).

---

## Keamanan

* Tidak ada secret di repo (cek `.gitignore`): API key hanya di config Bob lokal & Global Variables Langflow.
* Data client demo = dummy. Kredensial tidak pernah di-hardcode di flow.

## Roadmap

MVP: Bob + MCP + proposal + revisi + PRD → Ekstensi: Gateway Telegram → multi-tenant → CRM & e-sign.
Model monetisasi: SaaS per perusahaan / per proposal + add-on revisi & ekspor premium.

## Tim

*(maks 2 orang — isi nama + sertifikat IBM SkillsBuild University Education 2026)*
