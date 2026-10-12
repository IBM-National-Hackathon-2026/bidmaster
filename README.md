# BidMaster AI — Asisten Pre-sales Pemeriksa Dokumen Tender

Alat internal perusahaan untuk memenangkan tender: unggah dokumen requirement klien → AI menganalisis **tiap butir** (status Sesuai/Sebagian/Berisiko + sitasi ke teks asli) → manusia memutuskan tiap butir → harga proposal ditentukan manusia per baris → 3 gate memblokir unduhan sampai syarat terpenuhi → export DOCX ber-cover logo.

Bukan chatbot bebas. Harga hanya dari katalog sebagai **acuan**. Fakta tak pasti ditandai `[perlu konfirmasi]`. Status output selalu *draft* sampai manusia menyetujui.

```
Tim → React 19 (wizard 3 langkah) → Laravel 13 API → Langflow (RAG K01–K18) → item + sitasi
                                   ↘ gate (KAK/pagu/legalitas) → harga manusia → approve → DOCX
                                   ↘ /api/agent → Bob (langflow flow yang sama, mode Proposal/Umum)
```

## Struktur (core push)

```
README.md                  ← satu-satunya *.md di root (docs/ tidak di-push)
.env.example .gitignore compose.yaml (Docker)
backend/   (Laravel 13 API: auth, analisis, gate, harga, approve, export, agent, audit)
frontend/  (React 19 + TS + Vite + Tailwind + shadcn-style; wizard Unggah→Tinjau→Harga; ui-text.ts)
docker/    (backend.Dockerfile + frontend.Dockerfile + nginx.conf)
knowledge/*.example        ← template sanitasi (data asli *.md/*.yaml tidak di-push)
knowledge/perusahaan.example + knowledge_perusahaan.example ← identitas + knowledge K01–K18 FIKTIF demo
langflow/flows/*.json      ← flow kanonis untuk diimport ke Langflow
skills/registry.yaml       ← 1 MCP tool aktif
data/  (gitignored)        ← bidmaster.sqlite (bind-mount, di-migrate saat container start)
```

## Cara pakai lokal (2 menit)

```sh
# backend (butuh PHP 8.2+ + Composer, ext-zip untuk PhpWord)
cd backend
composer install
php artisan app:boot                             # migrate + seed + cache (1 perintah)
php artisan serve --host=127.0.0.1 --port=8000   # API di :8000

# frontend (butuh Node 20+, terminal lain)
cd frontend
npm install
npm run dev                                      # UI di :5173 (proxy /api → :8000)
# login: admin / bidmaster123 → ganti via SEED_ADMIN_PASS di backend/.env
```

## Cara pakai Docker

```sh
# 1) file DB harus ada dulu agar bind-mount berupa file, bukan folder:
#    PowerShell: mkdir data -ea 0; New-Item -ItemType File data/bidmaster.sqlite -Force
#    Linux/macOS: mkdir -p data && touch data/bidmaster.sqlite
# 2) jalan (build sekali, ~1-2 menit; berikutnya cepat karena cache layer)
SEED_ADMIN_PASS=xxx LANGFLOW_URL=http://host.docker.internal:7860 LANGFLOW_API_KEY=xxx \
  docker compose up --build -d
# UI http://localhost:8080 (nginx → frontend + proxy /api → backend)
docker compose logs -f backend                   # pantau: "Aplikasi siap."
```

**Yang terjadi saat start** (`docker compose up`):
1. Container `backend` menjalankan `php artisan app:boot` → migrasi, seed admin (dilewati bila sudah ada), lalu cache config/route/view — semua dalam **satu bootstrap** (dulu 5 proses terpisah).
2. `frontend` = nginx menyajikan SPA hasil build.
3. API siap ±8 detik, halaman ±1 detik. Cek: `curl http://localhost:8080/api/health` → `{"ok":true}`.

Migrasi dijalankan otomatis saat container start. Perubahan kode → `docker compose build backend frontend && docker compose up -d --force-recreate`. Menghentikan: `docker compose down` (data tetap di `data/bidmaster.sqlite`).

## Alur 3 langkah

1. **Unggah** — tarik/tempel dokumen requirement (txt/md/csv/json/pdf/docx ≤200KB) + dokumen pendukung opsional; isi instansi/pagu/jenis/durasi; tekan **Analisis dokumen**. Dokumen bisa **diganti/dihapus** (animasi unggah). Penanda lokasi stabil: nomor **baris** (teks) atau **halaman+paragraf** (PDF/DOCX).
2. **Tinjau** — tiap butir punya status + alasan + keyakinan + **angka sitasi**. Keputusan manusia per butir: **Benar / Ubah status / Tanyakan ke klien** (alasan wajib saat mengubah), plus catatan internal. Butir **Berisiko wajib diputuskan** sebelum lanjut. Ada tab **Tanya Bob**.
3. **Harga & Setujui** — harga acuan read-only + harga proposal editable per baris (alasan wajib bila beda dari acuan), diskon + alasan; deviasi >15% atau diskon >10% → **Perlu persetujuan (admin)** dan memblokir unduh; snapshot acuan disimpan. Pratinjau → gate lolos → **Unduh DOCX** (cover logo, header/footer, nomor halaman) / .md / Cetak-PDF + versi.

## Sitasi: angka kecil → popover (gaya NotebookLM)

Setiap klaim AI disertai **angka sitasi kecil inline** tepat setelah teks butir (mis. `... 1 2`). Perilaku:

- **Klik angka** → muncul **popover mengambang** berisi cuplikan sumbernya: judul (mis. nama file requirement / kode knowledge), jenis sumber, dan isi/teks yang dikutip. Popover diposisikan otomatis agar selalu di dalam layar (di mobile bisa membalik ke atas tombol) dan **tidak menggulir halaman** (isi popover punya scroll sendiri).
- **Hover** → tooltip singkat (mis. "Klien — baris 3").
- **"Lihat sumber lengkap"** di popover → membuka **panel samping** dengan konteks lebih luas: teks asli ter-*highlight* + baris sebelum/sesudah (sumber klien), atau isi knowledge read-only. Di layar kecil panel ini menjadi *bottom-sheet*.
- Menutup: klik di luar, tombol X, atau `Esc`. Fokus keyboard kembali ke angka sitasi.

Jenis sumber yang bisa dibuka: **Klien** (baris/halaman+paragraf dokumen), **Knowledge** (kode K01–K18, read-only), **Katalog** (kode + harga acuan), **Pengguna** (nilai diisi manual). Sumber klien divalidasi backend terhadap dokumen tersimpan; tak valid → butir ditandai `perlu dikonfirmasi`.

## Agen Bob

Tab **Tanya Bob** (Langkah 2) + halaman penuh **`/bob`**. Fitur: **mode Proposal** (grounded ke knowledge K01–K18 + dokumen) atau **mode Umum** (jawab pertanyaan bebas di luar konteks, tetap tanpa mengarang fakta), lampiran dokumen sebagai konteks (tidak disimpan), animasi berpikir, salin jawaban, dan **unduh jawaban** sebagai **Word (.docx ber-cover)** atau **Markdown (.md)**. Bob tidak pernah menetapkan harga final.

## Cara kerja di balik layar

1. React kirim JSON ke Laravel; validasi per-field (frontend + backend) → 400 + nama field → UI fokus ke sana.
2. `AnalysisService::prompt` menyusun prompt; `LangflowService` memanggil Langflow Run API (timeout 300 dtk, `set_time_limit`) dan memvalidasi keluaran JSON.
3. `AnalysisService::validateItems` mencocokkan tiap `sumber_klien` ke dokumen tersimpan (baris/halaman+paragraf) → tandai `perlu_konfirmasi` bila tak cocok.
4. `GateEvaluator` menjalankan 3 Strategy: `PaguCheck`, `KakCoverageCheck`, `LegalitasCheck`. Gagal = BLOKIR.
5. Harga: `PriceService` hitung subtotal dari katalog; manusia boleh menimpa + alasan; snapshot acuan disimpan; deviasi/diskon besar → butuh persetujuan admin.
6. Export: `ProposalDocxService` (dari snapshot) & `DocxExportService` (Markdown→DOCX) → cover logo + header/footer + nomor halaman (PhpWord).
7. Login: bcrypt + token sha256 di DB, sesi 12 jam, cookie HttpOnly + header Bearer. Setiap analisis/putusan/harga/approve/unduh tercatat di audit.
8. `/api/agent` diproxy `LangflowService`; `POST /api/agent/file` membuat file unduhan (docx/md).

Design pattern: Controller tipis → Service layer → Repository (interface + Eloquent) → Strategy (gates) → Middleware (TokenAuth, RequireRole, SecurityHeaders, throttle) → validasi di frontend + backend.

## Pola & Arsitektur (Clean Code / OOP)

Backend Laravel menerapkan **layered architecture** dengan pemisahan tanggung jawab yang jelas (bukan DDD penuh — lihat catatan di bawah):

| Layer | Folder | Tanggung jawab |
|---|---|---|
| **Presentation** | `Http/Controllers` | Terima request, panggil service, kembalikan JSON. Tipis — tanpa logika bisnis. |
| **Application/Service** | `Services` (9 kelas) | Logika bisnis: analisis, harga, komposisi draf, ekspor, parser dokumen. |
| **Domain/Strategy** | `Gates` | 3 aturan bisnis sebagai `GateCheck` yang bisa ditukar (`PaguCheck`, `KakCoverageCheck`, `LegalitasCheck`) diorkestrasi `GateEvaluator`. |
| **Persistence** | `Repositories` + `Contracts` | Akses data lewat **interface** (`MemberRepository`, `TokenRepository`, `AuditRepository`) → implementasi Eloquent bisa diganti tanpa menyentuh service. |
| **Domain Model** | `Models` | Entity Eloquent + relasi. |
| **Cross-cutting** | `Http/Middleware`, `Providers`, `Console/Commands` | Auth token, role, header keamanan, dependency injection, perintah artisan. |

**Prinsip OOP/SOLID yang terlihat:**
- **Dependency Injection** — semua dependensi di-inject lewat constructor (`ProposalsController`, `DraftComposerService`, dll) dan di-bind di `BidMasterServiceProvider` (IoC container Laravel).
- **Dependency Inversion** — service bergantung pada *interface* repository, bukan kelas konkret.
- **Single Responsibility** — 1 kelas 1 tugas (mis. `DocumentParserService` hanya parsing, `PriceService` hanya hitung harga).
- **Open/Closed** — menambah aturan gate = tambah kelas `GateCheck` baru, tanpa mengubah `GateEvaluator`.
- **Encapsulation** — konstanta/aturan bisnis (`INDUSTRIES`, `MAX_DOC`, sitemap) dikapsul dalam kelas; logika validasi terpusat di `DraftComposerService::validate`.

**Frontend** juga terstruktur: komponen terpisah (`components/`, `pages/`), state via hooks, API layer terpusat (`lib/utils.ts` + `lib/proposals.ts`), dan **semua teks UI di satu file** (`ui-text.ts`) — memudahkan lokalisasi tanpa menyentuh logika.

**Catatan jujur — ini BUKAN DDD penuh.** DDD idealnya punya *Bounded Context*, *Aggregate Root*, *Value Object*, *Domain Event*, dan *Ubiquitous Language* yang dipisah dari infrastruktur. Di sini logika domain masih menyatu dengan framework (Service menerima/ mengembalikan array, model Eloquent aktif sebagai persistence). Yang diterapkan adalah **layered + repository + strategy pattern** — fondasi yang rapi dan mudah diuji (82 test), tapi untuk skala enterprise bisa ditingkatkan ke DDD dengan memisahkan `Domain/` (entity + value object murni) dari `Infrastructure/`.

## Performa

Dioptimalkan agar tetap responsif saat analisis/Bob berjalan lama:

- **Server multi-worker** — `php -S` dijalankan dengan `PHP_CLI_SERVER_WORKERS=8` (pcntl). Sebelumnya *single-threaded*: satu request lambat (analisis 1–3 menit atau Bob) memblokir **seluruh** situs. Kini request lain tetap terlayani.
- **OPcache untuk CLI** (`opcache.enable_cli=1`, `validate_timestamps=0`) — file PHP tidak dikompilasi ulang tiap request.
- **Cache Laravel** — `config:cache`, `route:cache`, `view:cache` dijalankan saat start.
- **SQLite WAL + busy_timeout** — banyak worker boleh baca bersamaan tanpa "database is locked".
- **Aset ter-gzip + cache** — nginx meng-gzip JS/CSS/SVG/JSON (bundel JS 342 KB → **~104 KB** transfer) dan memberi `Cache-Control: immutable` pada aset ber-hash (Vite), `30d` untuk font/gambar.
- **Code-splitting per rute** — landing + shell dimuat lebih dulu; halaman aplikasi (`/app`, `/bob`, `/riwayat`, `/login`) di-*lazy-load*.
- **Dedupe status mesin** — `/api/agent/status` diambil sekali dan dibagi ke Nav + Bob (bukan dua kali).
- **Startup cepat** — `app:boot` menggabungkan migrate+seed+cache dalam satu bootstrap; `.dockerignore` memangkas konteks build dari ~190MB ke ~3,4MB; font di-preload.

Atur jumlah worker bila perlu: `PHP_CLI_SERVER_WORKERS=4 docker compose up`.

## Ketahanan galat mesin AI

Galat Langflow diklasifikasi menjadi pesan Indonesia ramah (bukan JSON mentah) + retry otomatis sekali:

| Kondisi | Kode | Tindakan |
|---|---|---|
| Kuota model habis (HTTP 429 / `RESOURCE_EXHAUSTED`) | `LF_QUOTA` | Pesan "kuota habis, tunggu/ganti model" + retry |
| Model tak dikenal (`No model class defined`) | `LF_MODEL` | Saran perbarui Langflow / ganti model |
| Langflow 5xx | `LF_SERVER` | Retry otomatis |
| Langflow tak terjangkau | `LF_UNREACHABLE` | Pesan "pastikan Langflow berjalan" |
| Keluaran tak terstruktur | `LF_FORMAT` | Minta ulang |

Detail teknis hanya masuk **log server**. Bila tetap gagal, pengguna diberi opsi **Lanjut tanpa AI (analisis darurat)**: setiap baris requirement jadi butir **Berisiko/keyakinan rendah** yang **wajib ditinjau manusia** — tidak ada yang lolos tanpa tinjauan.

## Keamanan

- Repo tanpa secret (`.env` di-ignore + diuji). Password bcrypt, token disimpan sebagai sha256.
- Peran: `viewer` read-only; analisis/putusan/harga/export/agent butuh admin/bd/reviewer (403 bila tidak).
- Rate-limit: login 10/menit, analisis 10/menit, draft/export/agent 30/menit, API umum 120/menit.
- Header ketat: CSP tanpa `unsafe-inline`, nosniff, DENY, no-referrer, no-store, Permissions-Policy.
- Batas dokumen 200KB; upload diproses di memori; dokumen klien diperlakukan sebagai data (di-escape, tidak dieksekusi).
- Kunci watsonx/Gemini hanya di Langflow (Global Variables), bukan repo.

## Testing

```
cd backend && php artisan test            # 82 test / 330 asersi (33 test keamanan)
cd frontend && npm run build              # tsc -b && vite build
```

Cakupan: alur proposal (unggah/analisis/keputusan/harga/approve/export), agent (mode Proposal/Umum, unduh file), ekspor DOCX (cover + tabel), dan 7 area keamanan (Authentication, Validation, Authorization, RateLimit, HeadersXss, Secrets, SupplyChain). Audit rantai: `composer audit`, `npm audit`.

## Integrasi IBM Langflow & Bob

- **Langflow** mengeksekusi analisis RAG (project `Bidmaster_Proposal`, flow `BidMaster Proposal Generator`: File → Split → Chroma + Embedding → Prompt → Language Model). Knowledge K01–K18 ada di KB Langflow (dikelola admin). Flow kanonis ada di `langflow/flows/`; panduan import di `langflow/IMPORT_GUIDE.md`.
- **Bob** adalah lapisan interaksi via **MCP** (`skills/registry.yaml`, tool `BidMaster Proposal Generator`); alur User → Bob → MCP → Langflow.
- Setel `LANGFLOW_URL`, `LANGFLOW_API_KEY`, `LANGFLOW_FLOW` di `.env`. Bila kosong, UI tetap jalan dan tombol analisis dinonaktifkan beralasan.

## Adaptasi perusahaan

`cp knowledge/<nama>.example knowledge/<nama>.md` (atau `.yaml`), lalu edit. Token `{...}` di template wajib dipertahankan. Identitas perusahaan: `knowledge/perusahaan.example` + `knowledge_perusahaan.example` (knowledge K01–K18). Header `# CONTOH SANITASI` di-strip otomatis oleh loader.
