# Jawaban Form Submission — Hackathon 2026

## Judul Project
**BidMaster — Agent Pembuat Proposal Web Otomatis dalam Hitungan Menit**

## Deskripsi Project
BidMaster adalah AI Agent untuk tim Business Development software house yang membuat proposal pembuatan website secara cepat dan sesuai standar perusahaan. Pengguna cukup mengobrol dengan agent (IBM Bob), memberikan informasi client, lalu agent menyusun proposal lengkap: profil client, keunggulan client, kekurangan client, rancangan website, timeline, RAB, dan pilihan paket harga. Seluruh proses mengikuti aturan perusahaan dan format proposal yang sudah ditentukan. Proses berat (analisis, penyusunan, validasi) dijalankan oleh workflow IBM Langflow yang dipanggil melalui MCP.

## Problem Statement
Saat prospek tiba-tiba tertarik dan meminta proposal, tim BD harus bergerak cepat. Template memang ada, tetapi tetap harus disesuaikan manual untuk setiap client:
1. mengecek aturan perusahaan dalam membuat proposal,
2. menyesuaikan format proposal,
3. menganalisis client (keunggulan, kekurangan) dan menulis rancangan web serta paket harga.

Akibatnya proposal lambat dibuat, isi tidak konsisten antar anggota tim, rawan melanggar aturan (misalnya diskon atau klausul), dan peluang bisa hilang karena kompetitor merespons lebih dulu.

## Target User
- Utama: staf/manager Business Development di software house, agensi web, dan freelancer studio.
- Sekunder: founder agensi kecil yang merangkap sales, serta project manager yang menyusun RAB dan timeline.
- Catatan: masalah ini berawal dari pengalaman pribadi dalam mencari client; kebutuhan pengguna lain perlu divalidasi lewat wawancara singkat.

## Mengapa Solusi Ini Dibutuhkan
- Kecepatan respons sangat menentukan peluang closing; proposal yang telat sering kalah.
- Penyesuaian template manual memakan waktu dan mudah salah.
- Analisis client (keunggulan dan kekurangan) sering dilewati karena terburu-buru, padahal itu yang membuat proposal terasa personal.
- Aturan perusahaan sering tidak terbaca ulang sehingga output tidak konsisten.

## Fitur Utama Project
1. **Intake percakapan**: agent menanyakan info client yang belum lengkap (nama, industri, website/sosmed, kebutuhan, budget).
2. **Analisis client otomatis**: keunggulan dan kekurangan client, kebutuhan digital, rekomendasi portofolio relevan.
3. **Rancangan web**: struktur halaman, fitur, dan rekomendasi teknologi.
4. **Paket harga otomatis**: 3 pilihan paket (Basic / Standard / Premium) sesuai price list perusahaan.
5. **Timeline & RAB-lite**: jadwal proyek dan rincian per komponen sebagai proporsi paket (estimasi).
6. **Aturan & format perusahaan**: aturan dan format proposal disimpan sekali, dipakai untuk semua proposal.
7. **Compliance check**: validasi otomatis terhadap aturan (batas diskon, klausul wajib, bagian wajib).
8. **Export**: proposal dalam Markdown/DOCX/PDF, siap dikirim.
9. **Rencana ekstensi chat app**: desain Telegram siap (tidak dibangun saat hackathon).

## Alur Penggunaan Project
1. Pengguna (sekali di awal) mengunggah aturan perusahaan, format proposal, dan price list.
2. Ada client tertarik → pengguna menulis ke Bob: "Buatkan proposal untuk Toko X, bisnis kuliner, butuh web pemesanan."
3. Bob memeriksa kelengkapan informasi dan bertanya balik jika ada yang kurang.
4. Bob memanggil tool MCP → Langflow menjalankan flow analisis, rancangan web, paket harga, timeline & RAB.
5. Langflow menyusun draft sesuai format dan menjalankan compliance check.
6. Bob menampilkan ringkasan dan draft; pengguna merevisi lewat chat ("turunkan paket premium", "tambah fitur booking").
7. Pengguna menyetujui → proposal di-export dan dikirim.

## Penggunaan IBM Langflow
Langflow menjadi **mesin eksekusi workflow**. Alur dibangun visual, terdiri dari 3 flow aktual:
- **`generate_proposal_draft`**: intake → analisis client (keunggulan, kekurangan, kebutuhan) → rancangan web + paket harga + timeline + RAB-lite → susun draft sesuai format → compliance check internal.
- **`revise_proposal`**: revisi bagian terdampak + compliance ulang.
- **`generate_prd_from_brief`**: PRD dari brief/proposal (skill kedua pembukti multi-skill).
- **Ingest**: via komponen File + RAG (aturan, format, price list masuk knowledge base).
Flow diekspos sebagai tool MCP agar bisa dipanggil Bob.

## Penggunaan IBM Bob
Bob menjadi **lapisan interaksi dan orkestrasi**: menerima permintaan bahasa natural, mengidentifikasi info yang kurang dan bertanya balik, memilih tool MCP yang tepat, menampilkan hasil, menangani revisi, dan menyimpan file output (proposal, PRD, dokumen pendukung) ke workspace. Perilaku Bob diatur lewat `AGENTS.md` dan `SKILL.md` di repositori.

## Bagaimana IBM Langflow dan IBM Bob Terintegrasi?
**Apa yang dilakukan Langflow?** Menjalankan pipeline proposal: retrieval aturan/format/price list, analisis client, penyusunan konten, perhitungan paket dan RAB, serta validasi kepatuhan.

**Apa yang dilakukan Bob?** Berbicara dengan pengguna, mengumpulkan dan merapikan input, memutuskan flow mana yang dipanggil, menyajikan hasil, menerima revisi, dan menyimpan output.

**Bagaimana data berpindah?** Pengguna → Bob (bahasa natural) → Bob menstrukturkan menjadi JSON (`client_profile`, `requirements`, `preferences`) → dikirim via **MCP tool call** → Langflow memproses dalam satu flow (analisis, web plan, paket, draft, compliance) dan mengembalikan proposal + `compliance_report` → Bob membacanya, menampilkan ke pengguna, dan mengirim revisi sebagai panggilan `revise_proposal` dengan konteks yang diperbarui.

**Output akhir:** Proposal client lengkap dan tervalidasi (Markdown/DOCX/PDF) berisi keunggulan client, kekurangan client, rancangan web, timeline, RAB, dan 3 pilihan paket harga, yang lahir dari kolaborasi keduanya: Bob sebagai antarmuka dan orkestrator, Langflow sebagai otak eksekusi.

## Pitching Deck
Struktur 7 slide singkat:
1. **Judul & tagline** — BidMaster.
2. **Problem** — proposal lambat, tidak konsisten, peluang hilang.
3. **Solution** — satu chat, proposal lengkap dalam menit.
4. **AI Agent** — Bob (interaksi) + MCP + Langflow (eksekusi); diagram alur.
5. **Demo / alur** — 4 langkah dari input hingga proposal.
6. **Impact** — target waktu 2–3 jam menjadi kurang dari 15 menit.
7. **Roadmap & skalabilitas** — multi-tenant, integrasi CRM, industri lain.

## Dampak yang Dihasilkan
Angka berikut adalah **target/hipotesis** yang perlu diukur saat uji coba, bukan hasil yang sudah terbukti:
- Waktu pembuatan proposal: dari ±2–3 jam menjadi ≤15 menit (pengurangan ±85–90%).
- Pekerjaan manual penyesuaian template berkurang hingga ±80%.
- Konsistensi terhadap aturan perusahaan: target ≥95% proposal lolos compliance check pada draft pertama.
- Kapasitas: satu staf BD dapat menangani 3–5x lebih banyak permintaan proposal per minggu.
- Cara ukur: catat waktu sebelum vs sesudah pada 5–10 proposal uji.

## Potensi Pengembangan & Skalabilitas
- **Pengguna**: dari individu ke tim BD (multi-user, multi-tenant, aturan dan template per perusahaan).
- **Integrasi**: CRM (HubSpot, Odoo), Google Drive, e-signature, WhatsApp/Telegram.
- **Industri**: konsultan IT, agensi kreatif/marketing, kontraktor, event organizer, dan bisnis jasa lain yang butuh proposal cepat.
- **Fitur lanjut**: riwayat dan win-rate proposal, rekomendasi harga berbasis data historis, analisis kompetitor otomatis.

## Apa yang Membuat Project Ini Berbeda?
1. **Berbasis aturan perusahaan**: proposal dibuat dan divalidasi terhadap aturan dan format milik perusahaan, bukan template generik.
2. **Analisis client di dalam proposal**: keunggulan dan kekurangan client menjadi dasar rancangan web dan paket harga sehingga proposal terasa personal.
3. **Arsitektur agent modular**: Bob untuk interaksi dan Langflow untuk eksekusi lewat MCP; alur bisa diubah secara visual tanpa menulis ulang agent.

## Kemampuan AI Agent
Otomatis:
- Mengekstrak dan merapikan info client dari pesan bebas.
- Menganalisis keunggulan dan kekurangan client.
- Menyusun rancangan web, paket harga, timeline, dan RAB.
- Menyusun proposal sesuai format dan menjalankan compliance check.

Semi-otomatis (butuh persetujuan pengguna):
- Menentukan harga final dan diskon.
- Revisi isi proposal lewat chat.
- Mengirim proposal ke client.
