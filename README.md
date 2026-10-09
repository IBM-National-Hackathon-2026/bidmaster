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
api/ server.py knowledge.py auth.py gates.py export_docx.py langflow_client.py
web/ index.html login.html app.html agent.html app.js agent.js login.js index.js
     styles.css agent.css
  → UI memakai Bootstrap 5 (framework CSS via CDN) + tema kustom di styles.css.
  → Seluruh JS/CSS lokal file eksternal (tanpa inline) agar lolos CSP ketat.
knowledge/*.example        ← 9 template sanitasi (tanpa embel .md/.yaml)
langflow/flows/*.json      ← 3 kanonis (generate_proposal_draft, revise_proposal,
                             generate_prd_from_brief) + 1 eksperimen RAG
                             (bidmaster_proposal_generator_rag)
langflow/mcp.json.example  ← template endpoint MCP (tanpa secret)
skills/registry.yaml       ← daftar MCP tools (3 kanonis)
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

1. Form di browser (Bootstrap untuk layout, `styles.css` untuk tema) mengirim data JSON ke server (`POST /api/draft`).
2. Server memeriksa isian satu per satu. Kalau ada yang salah, server menolak dan menunjuk field-nya.
3. Kalau lolos, server menghitung total dari katalog: harga satuan × qty.
4. Server menempel hasil ke template dokumen (token `{...}` diganti isi asli).
5. Fakta yang belum pasti ditulis `[perlu konfirmasi]`, bukan dikarang.
6. Gate memeriksa tiga hal: tiap baris KAK cocok komponen, total tidak lewat pagu, NIB/NPWP/akta terisi.
7. Hasil kembali ke browser: draft + skor + status LOLOS/BLOKIR. BLOKIR berarti perbaiki dulu.
8. Login memakai password hash dan sesi 12 jam. Setiap buat draft dan export tercatat di audit.
9. Export DOCX dibuat langsung oleh server tanpa library tambahan.
10. Jalur chat (`/agent`) meneruskan pesan ke Langflow via `api/langflow_client.py`. Tanpa `LANGFLOW_URL` + `LANGFLOW_API_KEY`, endpoint mengembalikan 503 dan form deterministik tetap jalan.

## Flow Langflow + watsonx

- 3 flow kanonis tetap jadi kontrak (`skills/registry.yaml`): `generate_proposal_draft`, `revise_proposal`, `generate_prd_from_brief`.
- Flow baru `bidmaster_proposal_generator_rag` adalah eksperimen pola RAG (File → Split → Chroma + Embedding → Prompt → Language Model). Struktur graf valid, tapi belum setara flow kanonis: belum ada LLM compliance-checker khusus dan awalnya tanpa `endpoint_name` (sudah diisi) plus sisa token `{variable_name}` di prompt (sudah dibersihkan).
- Sebelum dipakai: import ke Langflow, upload ulang file knowledge, isi direktori persist Chroma, uji di Playground, baru expose bila lolos.
- Kunci IBM watsonx tidak disimpan di repo atau backend. Isi di dalam Langflow pada komponen Language Model + Embedding Model: provider `ibm_watsonx`, nama model, `project_id`, endpoint region (`base_url_ibm_watsonx`), dan API key via Global Variables Langflow. Backend hanya butuh `LANGFLOW_URL` + `LANGFLOW_API_KEY` di `.env` lokal.

## Keamanan

- Repo tidak menyimpan secret. Password awal diganti lewat `SEED_ADMIN_PASS`.
- Password disimpan sebagai hash, bukan teks asli.
- Sesi login 12 jam dengan cookie HttpOnly.
- Draft dan export wajib login.
- Batas ukuran request dan rate-limit per IP aktif.
- Header keamanan ketat (CSP, nosniff, no-store).
- File upload hanya dibaca di memori lalu dibuang.
- Database lokal (`data.db*`) tidak ikut push.
- Dokumen status draft sampai manusia menyetujui.
