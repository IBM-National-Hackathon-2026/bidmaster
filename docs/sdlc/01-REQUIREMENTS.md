# REQUIREMENTS — BidMaster

## 1. Ringkasan
Agent yang membantu tim Business Development membuat proposal website yang sesuai aturan dan format perusahaan dari input percakapan singkat.

## 2. Stakeholder
| Peran | Kebutuhan |
|---|---|
| Staf/Manager BD | Proposal cepat dan konsisten |
| Owner/Manajemen | Kontrol aturan, harga, dan diskon |
| Client (penerima) | Proposal jelas, personal, mudah dibandingkan |
| Juri hackathon | Integrasi Bob + Langflow yang jelas |

## 3. Functional Requirements
| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Pengguna dapat memasukkan aturan perusahaan (teks/MD/PDF) | Must |
| FR-02 | Pengguna dapat memasukkan format/template proposal | Must |
| FR-03 | Pengguna dapat memasukkan price list dan paket layanan | Must |
| FR-04 | Pengguna dapat memasukkan info client lewat chat bebas | Must |
| FR-05 | Agent mendeteksi info yang kurang dan bertanya balik | Must |
| FR-06 | Sistem menghasilkan analisis keunggulan dan kekurangan client | Must |
| FR-07 | Sistem menghasilkan rancangan web (halaman, fitur) | Must |
| FR-08 | Sistem menghasilkan 3 pilihan paket harga | Must |
| FR-09 | Sistem menghasilkan draft proposal sesuai format | Must |
| FR-10 | Sistem menjalankan compliance check terhadap aturan | Must |
| FR-11 | Pengguna dapat merevisi lewat chat | Should |
| FR-12 | Sistem menghasilkan timeline dan RAB-lite (rincian per komponen sbg proporsi paket, bertanda estimasi) | Should |
| FR-13 | Export ke Markdown dan DOCX/PDF | Should |
| FR-14 | Rekomendasi portofolio relevan | Could |
| FR-15 | Antarmuka Telegram | **Won't (MVP) — RENCANA pasca-hackathon, desain di `06-INTERFACE.md` §4** |
| FR-16 | Riwayat proposal dan pencarian | Could |
| FR-17 | Akun dan login multi-user | Won't (MVP) |

## 4. Non-Functional Requirements
| ID | Requirement |
|---|---|
| NFR-01 | Waktu generate draft ≤ 3 menit (target demo; ≤15 menit termasuk revisi ringan) |
| NFR-02 | Bahasa utama Indonesia, mendukung Inggris |
| NFR-03 | Tidak mengarang fakta client; data yang tidak diketahui ditandai `[perlu konfirmasi]` |
| NFR-04 | Harga hanya berasal dari price list, tidak dikarang |
| NFR-05 | Data client tidak disimpan di luar workspace pengguna |
| NFR-06 | API key disimpan di `.env`, tidak di-commit |
| NFR-07 | Setiap output menyertakan compliance report |

## 5. Constraints (aturan hackathon)
- Wajib memakai **IBM Bob** dan **IBM Langflow**.
- Arsitektur: User → Bob → MCP → Langflow.
- Telegram hanya **rencana** (tidak dibangun saat hackathon).
- Antarmuka pengguna: chat Bob + file workspace (spesifikasi di `06-INTERFACE.md`).
- Deadline submission: 4 Oktober 2026.
- Tim maks 2 orang.

## 6. Asumsi
- Perusahaan memiliki price list yang bisa diberikan sebagai dokumen.
- Info client bersifat publik atau diberikan pengguna.
- Analisis kekurangan client bersifat saran, harus ditinjau manusia.

## 7. Di luar cakupan MVP
Login/akun, riwayat lengkap, e-signature, integrasi CRM, analisis kompetitor otomatis.

## 8. Kriteria Penerimaan
- Dari 1 prompt + dokumen aturan/format, sistem menghasilkan proposal lengkap.
- Compliance report muncul dan menandai pelanggaran yang sengaja diuji.
- Alur Bob → MCP → Langflow dapat didemokan end-to-end.
