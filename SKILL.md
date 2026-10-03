---
name: proposal-writer
description: Membuat proposal website untuk client dari info percakapan, sesuai aturan dan format perusahaan. Gunakan saat user meminta proposal, penawaran, paket harga, RAB, atau analisis client untuk pembuatan web.
---

# Skill: Proposal Writer

## Kapan dipakai
User menyebut client baru, meminta proposal/penawaran, paket harga, timeline, atau RAB pembuatan website.

## Prasyarat
Knowledge base sudah berisi aturan perusahaan, format proposal, dan price list
(masuk via File + RAG di Langflow). Detail antarmuka: `06-INTERFACE.md`.

## Langkah
1. **Ekstrak** info client ke `client_profile` (nama, industri, website/sosmed, kebutuhan, budget).
2. **Cek kelengkapan.** Minimal wajib: nama, industri, kebutuhan. Jika kurang, tanya paling banyak 3 pertanyaan sekaligus.
3. **Susun**: panggil `generate_proposal_draft` → analisis + rencana + draft + compliance (internal flow).
4. **Sajikan** ringkasan + draft + compliance report, minta persetujuan.
5. **Revisi**: jika diminta, panggil `revise_proposal`, tampilkan diff ringkas.
6. **Simpan** ke `outputs/<slug-client>-proposal-v<n>.md` setelah disetujui.
7. **Ekspor** sesuai kata kunci user (lihat "Ekspor format"). Bob yang membuat file, bukan Langflow.

## Aturan
- Jangan mengarang fakta client; tandai `[perlu konfirmasi]`.
- Harga hanya dari price list; jangan membuat angka sendiri.
- Kekurangan client ditulis konstruktif, sebagai peluang perbaikan, bukan kritik.
- Minta persetujuan sebelum harga final, diskon di luar batas, atau pengiriman.
- Gunakan bahasa Indonesia profesional kecuali diminta lain.

## Ekspor format
Flow mengembalikan Markdown + compliance report. Di akhir proposal ada blok
`<!-- BIDMASTER_DATA {json} BIDMASTER_DATA -->` berisi data terstruktur
(packages, timeline, rab_lite). Blok ini hanya untuk mesin: **hapus dari file .md/.docx/.pdf**
sebelum disimpan, dan jangan tampilkan ke user di chat.

| Kata kunci user | Aksi Bob | Nama file |
|---|---|---|
| tidak disebut | Simpan Markdown | `outputs/<slug>-proposal-v<n>.md` |
| "word", "dokumen", "docx" | Konversi Markdown ke DOCX (pandoc / python-docx) | `...-v<n>.docx` |
| "pdf" | Konversi Markdown ke PDF | `...-v<n>.pdf` |
| "excel", "xlsx", "spreadsheet", "RAB" | Buat XLSX dari blok `BIDMASTER_DATA` (bukan dari tabel Markdown) | `...-rab-v<n>.xlsx` |
| beberapa kata kunci | Buat semua format yang diminta | sesuai di atas |

Aturan ekspor:
- Excel: sheet `Paket` (nama, harga, durasi, fitur), `RAB-lite` (per paket: komponen, kode price list, qty, satuan, harga satuan, subtotal; subtotal = rumus `qty*harga_satuan`, beri label ESTIMASI), `Timeline`. Nilai `null` ditulis "[perlu konfirmasi]".
- Cek konsistensi: total di XLSX harus sama dengan angka di proposal. Jika beda, hentikan dan laporkan ke user.
- Jangan ekspor sebagai final (status `approved`) jika `compliance_report.passed` = false atau user belum menyetujui.
- Jika blok `BIDMASTER_DATA` tidak ada atau JSON tidak valid, jangan membuat XLSX; panggil ulang `revise_proposal` dengan instruksi "sertakan blok BIDMASTER_DATA yang valid".
- Revisi: ekspor ulang dari versi terbaru dengan nomor versi baru; versi lama tidak ditimpa.

## Format keluaran
Ikuti struktur di `02-PRD.md` bagian 8, lalu lampirkan `compliance_report`.

## Contoh pemicu
- "Ada client resto tertarik bikin web pemesanan, buatin proposalnya."
- "Turunkan paket Premium jadi lebih murah, tapi tetap sesuai aturan diskon."
- "Simpan proposalnya sebagai PDF dan buatkan RAB dalam Excel."