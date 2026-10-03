# TODO — BidMaster (deadline submission: 4 Oktober 2026)

Tanggal awal 30 Sep 2026; waktu sempit sehingga fokus MVP.

## Hari 1 (30 Sep – 1 Okt): Fondasi
- [ ] Setup IBM Bob dan repo (`AGENTS.md`, `SKILL.md`)
- [ ] Setup Langflow lokal
- [ ] Siapkan data contoh: aturan perusahaan, format proposal, price list (dummy)
- [ ] Bangun Flow Ingest + knowledge base
- [ ] Ekspos flow sebagai tool MCP dan uji dipanggil dari Bob

## Hari 2 (1–2 Okt): Inti
- [ ] Flow Client Analysis
- [ ] Flow Web Plan & Pricing (3 paket dari price list)
- [ ] Flow Composer sesuai format
- [ ] Flow Compliance (minimal 5 aturan uji)

## Hari 3 (2–3 Okt): Integrasi dan Kualitas
- [ ] Alur end-to-end Bob → MCP → Langflow
- [ ] Revisi lewat chat (`revise_proposal`)
- [ ] Export Markdown (DOCX/PDF jika sempat)
- [ ] Kunci model LLM + siapkan API key cadangan (kuota free-tier terbatas!)
- [ ] Pre-generate 1 proposal + 1 PRD sebagai cadangan demo
- [ ] Uji 3 kasus client berbeda; catat waktu untuk metrik dampak

## Hari 4 (3–4 Okt): Submission
- [ ] Pitching deck 7 slide
- [ ] Rekam video demo cadangan
- [ ] Finalisasi jawaban form (`00-SUBMISSION-FORM.md`)
- [ ] Cek angka dampak: tandai sebagai target atau hasil uji sebenarnya
- [ ] Submit sebelum deadline

## Opsional (jika ada waktu)
- [ ] Timeline & RAB lebih detail
- [ ] Rekomendasi portofolio

## Backlog pasca-hackathon (termasuk RENCANA Telegram)
- [ ] Telegram bridge (desain beku di `06-INTERFACE.md` §4; mulai hanya jika MVP stabil + sisa ≥ 1 hari)
- [ ] Riwayat proposal, akun/login, multi-tenant
- [ ] Integrasi CRM dan e-signature
- [ ] Analisis kompetitor otomatis
