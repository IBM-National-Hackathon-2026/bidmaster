# BidMaster — Alat Internal Penyusun Draft Tender (draft → gate → approve manusia)

Alat internal perusahaan untuk memenangkan tender: isi form terstruktur → draft dokumen penawaran 11 bab + RAB per-komponen → lolos 3 gate korporat → approve manusia → export DOCX.

Bukan chatbot bebas. Harga hanya dari katalog. Fakta tak pasti ditandai `[perlu konfirmasi]`. Status output selalu *draft* sampai manusia menyetujui.

```
Tim → React (shadcn-style) → Laravel API → draft + compliance + gate → approve → DOCX
                        ↘ /api/agent → Langflow (watsonx), 1 flow BidMaster Proposal Generator
```

## Struktur (core push)

```
README.md                  ← satu-satunya *.md di repo
.env.example .gitignore
backend/  (Laravel 13 API: auth, draft, gate, export, agent, audit + 7 testing)
frontend/ (React 19 + TS + Vite + Tailwind + shadcn-style + React Router)
docker/   (compose.yaml + Dockerfile backend/frontend + nginx.conf)
knowledge/*.example        ← 9 template sanitasi (data asli *.md/*.yaml tidak di-push)
langflow/flows/*.json      ← flow aktif bidmaster_proposal_generator_rag (+ referensi lama)
skills/registry.yaml       ← 1 MCP tool aktif
```

## Cara pakai lokal (2 menit)

```sh
# backend (butuh PHP 8.2+ + Composer)
cd backend
composer install
php artisan migrate --force && php artisan db:seed --force
php artisan serve --host=127.0.0.1 --port=8000   # API di :8000

# frontend (butuh Node 20+, terminal lain)
cd frontend
npm install
npm run dev                                      # UI di :5173 (proxy /api → :8000)
# login: admin / bidmaster123 → ganti via SEED_ADMIN_PASS di backend/.env
```

## Cara pakai Docker

```sh
SEED_ADMIN_PASS=xxx LANGFLOW_API_KEY=xxx docker compose -f docker/compose.yaml up --build
# UI http://localhost:8080 (nginx → frontend + proxy /api → backend)
```

Adaptasi perusahaan: `cp knowledge/<nama>.example knowledge/<nama>.md` (atau `.yaml`), lalu edit. Token `{...}` di template wajib dipertahankan.

## Daftar template (*.example) — fungsi masing-masing

| File push | Salin menjadi | Fungsi di sistem |
|---|---|---|
| `proposal_template.example` | `proposal_template.md` | Template 10-bab mode website (demo). Wajib ada `# {client_name}`, `## 2. Profil Client`, `## 7. RAB`, klausul `DP 50%` — dipakai compliance check. |
| `price_catalog.example` | `price_catalog.yaml` | Satu-satunya sumber harga website (Basic/Standard/Premium) + `discount_rules`. |
| `tender_template.example` | `tender_template.md` | Template 11-bab mode tender. Wajib ada `## 3. Profil Perusahaan`, `## 10. Penawaran Harga`. |
| `tender_price.example` | `tender_price.yaml` | Satu-satunya sumber harga tender (`komponen[].{kode,nama,satuan,harga_dasar}`). |
| `tender_company.example` | `tender_company.md` | Profil perusahaan, 1200 karakter pertama masuk bab Profil. |
| `tender_team.example` | `tender_team.yaml` | Data tim, 6 pertama masuk bab Tim. |
| `company_rules.example` | `company_rules.md` | Acuan operasional manusia. Tidak dibaca composer. |
| `tender_sop.example` | `tender_sop.md` | Acuan SOP. Ringkasannya dipakai di bab Metodologi. |
| `tender_checklist.example` | `tender_checklist.md` | Checklist manual tim. |

Header `# CONTOH SANITASI` di-strip otomatis oleh loader.

## Cara kerja di balik layar

1. React kirim JSON ke Laravel (`POST /api/draft`).
2. `DraftComposerService::validate` memeriksa per field; gagal → 400 + nama field → UI fokus ke sana.
3. Lolos → total dari katalog (harga × qty), template diisi via token `{...}`.
4. Fakta tak pasti → `[perlu konfirmasi]`, bukan dikarang.
5. `GateEvaluator` jalankan 3 Strategy: `PaguCheck`, `KakCoverageCheck`, `LegalitasCheck`. Gagal = BLOKIR.
6. Compliance 7 cek + skor %; hasil: draft + pills + kotak gate.
7. Login: bcrypt + token sha256 di DB, sesi 12 jam, cookie HttpOnly + header Bearer. Setiap draft/export/agent tercatat di audit.
8. Export DOCX via PhpWord; chat `/agent` diproxy `LangflowService` (timeout 300 dtk).

Design pattern: Controller tipis → Service layer → Repository (interface + Eloquent) → Strategy (gates) → Middleware (TokenAuth, RequireRole, SecurityHeaders, throttle) → Form validation di frontend + backend.

## Keamanan

- Repo tanpa secret (`.env` di-ignore + diuji). Password bcrypt, token disimpan sebagai sha256.
- Peran: `viewer` read-only; draft/export/agent butuh admin/bd/reviewer (403 bila tidak).
- Rate-limit: login 10/menit, draft/export/agent 30/menit, API umum 120/menit.
- Header ketat: CSP tanpa `unsafe-inline`, nosniff, DENY, no-referrer, no-store, Permissions-Policy.
- Batas body/dokumen 200KB; upload hanya di memori; lockout implisit via throttle + bcrypt cost.
- Kunci watsonx hanya di Langflow (Global Variables), bukan repo. Jalankan Langflow dengan `LANGFLOW_RESTRICT_LOCAL_FILE_ACCESS=false`.

## 7 testing keamanan (`backend/tests/Feature/Security/`, 33 test)

1. **Authentication** — login OK/salah, token wajib, logout mematikan token, expiry, token di-hash.
2. **Validation** — 400 per-field (8 kasus), injeksi SQL netral, dokumen >200KB ditolak.
3. **Authorization** — viewer 403 di draft/export/agent, audit terisolasi per user.
4. **RateLimit** — login 429 setelah 10x, draft 429 setelah 30x.
5. **HeadersXss** — header keamanan ada, payload XSS kembali sebagai teks JSON.
6. **Secrets** — `.env` tak ter-track, contoh tanpa key asli, prod `APP_DEBUG=false`.
7. **SupplyChain** — `composer validate`, lock + platform PHP, `package-lock.json` ada.

Jalankan: `cd backend && php artisan test --filter=Security`. Audit rantai penuh: `composer audit`, `npm audit` (keduanya bersih saat ditulis).
