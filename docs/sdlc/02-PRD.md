# PRD — BidMaster

**Versi:** 0.1 | **Status:** Draft hackathon | **Owner:** Muhammad Iqbal Rizanta

## 1. Latar Belakang
Saat mencari client, prospek bisa tiba-tiba tertarik dan meminta proposal. Tim harus cepat menyusun proposal berisi keunggulan client, kekurangan client, rancangan web, dan pilihan paket harga. Template ada, tetapi tetap perlu disesuaikan manual dengan aturan perusahaan, format, dan info client.

## 2. Tujuan
- Memangkas waktu pembuatan proposal dari jam menjadi menit.
- Menjamin konsistensi dengan aturan dan format perusahaan.
- Membuat proposal lebih personal lewat analisis client.

## 3. Non-Tujuan
Tidak menggantikan keputusan harga final oleh manusia; tidak mengirim proposal tanpa persetujuan; tidak menjadi CRM.

## 4. Persona
**Raka, Business Development di software house.** Mengejar banyak prospek, sering dikejar waktu, tidak sempat membaca ulang aturan, butuh proposal yang rapi dan personal.

## 5. User Stories
1. Sebagai BD, saya ingin memasukkan aturan, format, dan price list sekali agar dipakai terus.
2. Sebagai BD, saya ingin mengetik info client secara bebas agar tidak mengisi form panjang.
3. Sebagai BD, saya ingin analisis keunggulan dan kekurangan client otomatis agar proposal personal.
4. Sebagai BD, saya ingin 3 pilihan paket harga agar client bisa memilih.
5. Sebagai BD, saya ingin revisi lewat chat agar cepat.
6. Sebagai manajer, saya ingin proposal divalidasi aturan agar tidak ada pelanggaran.

## 6. Fitur dan Prioritas (selaras roadmap fase)
| Fase | Fitur | MVP |
|---|---|---|
| 1 | Buat proposal (isi info client, susun otomatis, pratinjau) | Ya |
| 1 | Paket harga otomatis (rekomendasi, rincian, perbandingan) | Ya |
| 2 | Timeline & RAB | Sebagian |
| 3 | Analisis client (keunggulan, kebutuhan, portofolio) | Ya (inti) |
| 3 | Aturan & format (atur aturan, format, cek kepatuhan) | Ya |
| 3 | Template proposal (pustaka, sesuaikan, simpan) | Sebagian |
| 4 | Riwayat & sumber | Tidak |
| 4 | Akun & akses | Tidak |

Catatan prioritas: jika waktu sempit, fokus pada Fase 1 + analisis client + aturan/format karena itulah inti nilai dan demo.

## 7. Alur Pengguna
Setup sekali (aturan, format, price list) → kirim info client di chat → Bob bertanya jika kurang → Langflow memproses → draft + compliance report → revisi → export.

## 8. Struktur Proposal Output
1. Ringkasan eksekutif
2. Profil client
3. Keunggulan client
4. Kekurangan/peluang perbaikan client
5. Rancangan website (halaman, fitur, teknologi)
6. Timeline
7. RAB
8. Pilihan paket harga (3 paket + perbandingan)
9. Syarat dan ketentuan
10. Penutup dan kontak

## 9. Metrik Keberhasilan
| Metrik | Target |
|---|---|
| Waktu draft pertama | ≤ 15 menit termasuk revisi ringan |
| Lolos compliance draft pertama | ≥ 95% |
| Kepuasan pengguna uji (1–5) | ≥ 4 |
| Jumlah revisi manual | ↓ 50% |

## 10. Risiko
| Risiko | Mitigasi |
|---|---|
| Halusinasi info client | Tandai `[perlu konfirmasi]`, minta sumber |
| Harga salah | Ambil hanya dari price list terstruktur |
| Integrasi MCP gagal saat demo | Siapkan rekaman demo dan fallback lokal |
| Waktu terbatas | Kunci scope MVP di TODO |

## 11. Timeline (menuju 4 Okt 2026)
Lihat `05-TODO.md`.
