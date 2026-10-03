# INTERFACE — BidMaster

Dokumen ini mendefinisikan **semua antarmuka** project: chat (utama),
file workspace, dan kontrak MCP. Telegram didokumentasikan sebagai
**RENCANA** (desain saja, tidak diimplementasi saat hackathon).

> Nama kode implementasi: `bidmaster/` (tetap). Nama produk/dokumen: BidMaster.

## 1. Antarmuka Chat — IBM Bob (UTAMA)

Satu-satunya antarmuka pengguna saat hackathon. Tidak ada perintah khusus;
pengguna berbicara natural, Bob memilih MCP tool yang tepat.

### 1.1 Pesan pembuka (disarankan, bukan wajib)
> "Halo! Saya BidMaster. Kirim info client (nama, industri,
> kebutuhan, budget) dan saya susun draft proposalnya. Contoh:
> *Buatkan proposal untuk Kafe Arunika di Surabaya Timur,
> mau web + reservasi online, budget sekitar 10jt.*"

### 1.2 Pola percakapan baku
| Tahap | Bob | User |
|---|---|---|
| Minta info | "Siap! Sebelum saya susun, saya butuh: ..." (maks 3 pertanyaan) | Menjawab singkat |
| Proses | "Baik, saya panggil tool analisis + penyusunan..." (pesan progres) | Menunggu (< 3 menit) |
| Hasil | Ringkasan + compliance report + draft lengkap | "Setuju" / instruksi revisi |
| Revisi | "Sudah saya perbarui (v2). Ringkasan perubahan: ..." | "Setuju, finalkan" / revisi lagi |
| Selesai | File tersimpan di `outputs/`, status approved | Mengirim manual ke client |

### 1.3 Contoh pemicu → tool
| Ujaran user | Tool MCP |
|---|---|
| "Buatkan proposal untuk ..." | `generate_proposal_draft` |
| "Ganti/tambah/ubah ...", "turunkan paket ..." | `revise_proposal` |
| "Buatkan PRD untuk ..." | `generate_prd_from_brief` |
| Ambigu ("buatkan dokumen ...") | Bob bertanya: proposal / revisi / PRD? |

### 1.4 Aturan tampilan
- Bahasa Indonesia, ringkas; draft panjang disampaikan sebagai file/blok,
  chat hanya berisi ringkasan + compliance report.
- Ketidakpastian fakta ditandai `[perlu konfirmasi]`.
- Harga final, diskon di luar batas, pengiriman ke client → wajib persetujuan eksplisit.

## 2. Antarmuka File Workspace

### 2.1 Input (`knowledge/`, sekali di awal)
| File | Isi |
|---|---|
| `knowledge/company_rules.md` | Tone, struktur wajib, klausul, batas diskon |
| `knowledge/proposal_template.md` | 10 bab proposal (lihat §3) |
| `knowledge/price_catalog.yaml` | **Satu-satunya sumber harga** (Basic/Standard/Premium) |
| `knowledge/portfolio.md` (opsional) | Daftar portofolio untuk rekomendasi (fitur Could) |

### 2.2 Output (`outputs/`)
- Penamaan: `outputs/<slug-client>-proposal-v<n>.md`
  (contoh: `outputs/kafe-arunika-proposal-v1.md`).
- Setiap file diakhiri blok `compliance_report` + baris status
  (`draft` / `approved`) + tanggal.
- Export DOCX/PDF: konversi dari Markdown saat eksekusi Should (bisa via
  Bob menyimpan + tool konversi, atau manual).

### 2.3 Struktur proposal output (10 bab, selaras `02-PRD.md` §8)
1. Ringkasan eksekutif · 2. Profil client · 3. Keunggulan client ·
4. Kekurangan/peluang perbaikan · 5. Rancangan website ·
6. Timeline · 7. **RAB-lite** (rincian per komponen sebagai proporsi paket,
   bertanda estimasi — bukan RAB akuntansi penuh) ·
8. Pilihan paket (3 + perbandingan + 1 rekomendasi + alasan) ·
9. Syarat & ketentuan · 10. Penutup & kontak · + lampiran compliance report.

## 3. Antarmuka MCP (kontrak tool AKTUAL)

Yang berjalan adalah **3 Agent flow** (bukan 5 tool granular — itu visi desain,
lihat `03-ARCHITECTURE.md` §4). Tahap analisis/rencana/susun/validasi berjalan
**di dalam** `generate_proposal_draft` sebagai langkah internal.

| Tool (flow) | Input (dari Bob) | Output (Chat Output) |
|---|---|---|
| `generate_proposal_draft` | info client bebas + knowledge | proposal 10 bab + compliance report |
| `revise_proposal` | instruksi + versi terakhir | versi baru + diff ringkas + compliance ulang |
| `generate_prd_from_brief` | brief / proposal disetujui | PRD terstruktur |

Aturan kontrak: harga hanya dari price catalog; fakta hanya dari input;
`[perlu konfirmasi]` untuk inferensi; status awal selalu `draft`.

## 4. RENCANA: Antarmuka Telegram (tidak dikerjakan saat hackathon)

> Status: **DESAIN SAJA**. FR-15 = Won't (MVP). Dikerjakan pasca-hackathon bila ada waktu.
> Alasan: jalur demo dan penilaian wajib adalah Bob; Telegram menambah risiko
> (webhook, secret, approval-button) tanpa menambah nilai juri.

### 4.1 Desain (beku sampai MVP lolos)
- Satu bot → teruskan pesan ke Bob dengan konteks `chat_id → client aktif`.
- Perintah minimal: `/start`, `/proposal <info>`, `/revisi <instruksi>`,
  `/setuju`, `/batal`.
- Hasil kembali sebagai pesan ringkas + file dokumen; tombol inline
  **Setuju / Revisi** memetakan ke persetujuan eksplisit (§1.4).
- Larangan yang tetap berlaku: tanpa auto-kirim ke client, tanpa secret di repo,
  data client dummy selama demo.

### 4.2 Syarat mulai (definition of ready, pasca-hackathon)
MVP Bob+MCP stabil + compliance ≥ target + ada sisa waktu ≥ 1 hari penuh.
