# BidMaster — Alat Internal Penyusun Draft Tender (draft → gate → approve manusia)

Alat internal perusahaan untuk memenangkan tender: isi form terstruktur → dapat draft dokumen penawaran 11 bab + RAB per-komponen → lolos 3 gate korporat → approve manusia → export DOCX.

Bukan chatbot bebas. Tidak ada free-text prompt. Harga hanya dari katalog. Fakta tak pasti ditandai `[perlu konfirmasi]`. Status output selalu *draft* sampai manusia menyetujui.

```
Tim internal → Form 5 langkah (web/) → POST /api/draft → api/server.py compose
  + api/gates.py (KAK coverage, pagu, legalitas) → draft + compliance + gate
  → approve manusia → POST /api/export → DOCX
Jalur chat (opsional): Tim → IBM Bob → MCP → Langflow flows → draft + revisi + PRD
```

## Yang di-push (core only)

```
README.md                  ← satu-satunya *.md di repo
.env.example .gitignore requirements.txt (pyyaml saja)
api/ server.py knowledge.py auth.py gates.py export_docx.py
web/ index.html app.js styles.css
knowledge/*.example        ← 9 template sanitasi (tanpa embel .md/.yaml)
langflow/flows/*.json      ← generate_proposal_draft, revise_proposal, generate_prd_from_brief
langflow/mcp.json.example  ← template endpoint MCP (tanpa secret)
skills/registry.yaml       ← daftar MCP tools
```

`docs/`, `simulator/`, `outputs/`, `AGENTS.md`, `SKILL.md`, arsip flow lama: lokal saja, tidak di-push. `knowledge/*.md` / `*.yaml` asli (data perusahaan): tidak di-push, hanya `*.example` sanitasi.

## Cara pakai (2 menit)

```sh
cd bidmaster
pip install -r requirements.txt
python -m api.server          # http://127.0.0.1:8080
# login: admin / bidmaster123 → ganti via SEED_ADMIN_PASS
```

1. Login (Langkah 1) — sesi 12 jam, HttpOnly cookie, audit tercatat.
2. Isi instansi + pagu (Langkah 2). Pagu 0 = tanpa pagu.
3. Isi qty per komponen (Langkah 3) — harga satuan terkunci katalog, subtotal + total live di estbar.
4. Tempel/upload KAK + NIB/NPWP/akta (Langkah 4).
5. Klik Buat draft → hasil + pills compliance + kotak gate LOLOS/BLOKIR (Langkah 5).
6. Gate BLOKIR → perbaiki → draft ulang. Gate LOLOS → approve manusia → `.md` / `.docx` / Print-PDF.
7. Tombol `Isi contoh tender` untuk demo sekali klik (total Rp 17.750.000, gate LOLOS).

Adaptasi perusahaan: `cp knowledge/<nama>.example knowledge/<nama>.md` (atau `.yaml`), lalu edit. Token `{...}` di template wajib dipertahankan.

## Daftar template (*.example) — fungsi masing-masing

| File push | Salin menjadi | Fungsi di sistem |
|---|---|---|
| `proposal_template.example` | `proposal_template.md` | Template 10-bab mode website (demo). Wajib ada `# {client_name}`, `## 2. Profil Client`, `## 7. RAB`, kata Keunggulan/Kekurangan, klausul `DP 50%` — dipakai compliance check. |
| `price_catalog.example` | `price_catalog.yaml` | Satu-satunya sumber harga website (Basic/Standard/Premium). Struktur `packages[].{id,name,price_idr,timeline_weeks,features,best_for}` + `discount_rules`. |
| `tender_template.example` | `tender_template.md` | Template 11-bab mode tender. Wajib ada `## 3. Profil Perusahaan`, `## 10. Penawaran Harga` — dipakai compliance check. |
| `tender_price.example` | `tender_price.yaml` | Satu-satunya sumber harga tender. Struktur `komponen[].{kode,nama,satuan,harga_dasar}` — dipakai validator + gate pagu. |
| `tender_company.example` | `tender_company.md` | Profil perusahaan, 1200 karakter pertama masuk bab Profil. Legalitas diisi via form, bukan file ini. |
| `tender_team.example` | `tender_team.yaml` | Data tim (`anggota[].{id,nama,peran,keahlian,tarif_harian}`), 6 pertama masuk bab Tim. Jangan mengarang sertifikasi. |
| `company_rules.example` | `company_rules.md` | Acuan operasional manusia (tone, klausul, aturan fakta). Tidak dibaca composer. |
| `tender_sop.example` | `tender_sop.md` | Acuan SOP operasional. Tidak dibaca composer; ringkasannya dipakai di bab Metodologi. |
| `tender_checklist.example` | `tender_checklist.md` | Checklist manual tim (administrasi/teknis/harga/keamanan). Tidak dibaca composer. |

Header `# CONTOH SANITASI` di tiap `.example` di-strip otomatis oleh loader — tidak bocor ke draft final.

## Cara kerja di balik layar

**Loader (`api/knowledge.py`)**: `read_kn(nama)` → pakai file asli bila ada, fallback ke `*.example` bila tidak (pola `.env.example`). Clone segar jalan tanpa setup. Strip header sanitasi, pertahankan token `{...}`.

**Validator (`validate` di `api/server.py`)**: mode website/tender, nama ≥2 char, industri whitelist, durasi 1–12, diskon ≤ `discount_rules.max`, pagu 0–10M, legalitas ≤40 char, komponen kode dikenal + qty 0–1000 (maks 10 item), fitur whitelist (maks 8). Gagal → 400 + `field` → UI fokus ke field.

**Composer (`compose`)**: tender → `total = Σ harga_dasar × qty`, RAB tabel Kode/Komponen/Qty×Satuan/Subtotal, template 11 bab diisi via `str.replace` token (`{instansi}`, `{rab}`, `{tim}`, …), profil = company[:1200] + legalitas, tim = 6 anggota pertama, metodologi statis 7 tahap. Website → total = paket − diskon, RAB-lite proporsional via `split_total`. Fakta tak pasti → `[perlu konfirmasi: …]`.

**Gate (`api/gates.py`, murni fungsi)**: `kak_items` pecah dokumen per baris/koma/semicolon (≥8 char, maks 30); `kak_coverage` cocokkan kata ≥4 huruf per baris ke kode+nama komponen; `legal_check` NIB/NPWP/akta wajib isi; `gate` BLOKIR bila total > pagu / ada KAK tak terpetakan / legal kurang. Compliance 7 cek + skor %; `passed = semua cek + gate`.

**Auth (`api/auth.py`, sqlite3 stdlib)**: PBKDF2-HMAC-SHA256 200k iterasi, token 32B, sesi 12 jam, peran admin/bd/reviewer/viewer, tabel audit (login/draft/export). Seed `admin/bidmaster123` via `SEED_ADMIN_PASS`. DB `data.db*` di-gitignore.

**Export (`api/export_docx.py`, stdlib-only)**: Markdown → OOXML minimal via `zipfile` (heading, bold, tabel, list). Bukan konversi sempurna — cukup untuk draft.

**Server (`api/server.py`, stdlib `http.server`, satu origin)**: `GET / /app.js /styles.css /api/health /api/catalog /api/me /api/audit`, `POST /api/login /api/logout /api/draft /api/export`. Batas body 256KB / dokumen 200KB / markdown 200KB, rate-limit 20 req/menit/IP, header CSP ketat + nosniff + DENY + no-referrer + no-store, upload hanya di memori lalu dibuang.

**Frontend (`web/`, tanpa build)**: wizard 5 langkah + stepper, glossary tooltip (hover/fokus), estbar sticky (total/pagu/status live), subtotal per baris, validasi fokus per-field, riwayat localStorage + audit server, tombol contoh tender/website, print CSS.

**Jalur agentik (opsional, tidak wajib jalan)**: `skills/registry.yaml` daftar 3 MCP tools → `langflow/flows/*.json` diimport ke Langflow Project → expose MCP → Bob panggil `generate_proposal_draft` / `revise_proposal` / `generate_prd_from_brief`. Config di `langflow/mcp.json.example`; key asli hanya di config Bob lokal / Global Variables Langflow, tidak di-commit.

## Keamanan

Tidak ada secret di repo. Satu-satunya env backend: `SEED_ADMIN_PASS`. API key (Groq/Gemini/Langflow) hanya di `.env` lokal / config Bob / Langflow variables — histori pernah bocor, revoke bila pernah pakai key lama. Login wajib untuk draft/export; draft BLOKIR gate dilarang finalkan; harga final + kirim panitia butuh approve manusia.
