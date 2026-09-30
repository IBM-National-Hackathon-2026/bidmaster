# Panduan Fallback LLM Otomatis (tanpa setting ulang)

Komponen: `langflow/components/fallback_llm.py` → node **BidMaster Fallback LLM**.
Rantai otomatis: **Groq 70B → Groq 8B → Gemini 2.5-flash → Ollama (opsional)**.
Kuota habis / 429 / 503 / error apa pun → pindah sendiri ke berikutnya.

## Pasang (per flow, ~4 menit)

1. Buka flow di canvas → tambah node **Custom Component**.
2. Hapus kode contoh → paste SELURUH isi `fallback_llm.py` → **Check & Save**.
   Jika error merah, baca pesannya (biasanya typo paste) lalu save ulang.
3. Isi field: **Groq API Key** (wajib; gratis di `console.groq.com`),
   **Gemini API Key** (opsional, cadangan), Temperature biarkan 0.7.
   Ollama biarkan mati kecuali Ollama jalan di mesin ini.
4. **Satu garis**: output `model` (node Fallback) → input `model` (node Agent).
   Setelah tersambung, dropdown model + API key di dalam Agent **diabaikan** —
   tidak perlu diisi lagi.
5. Test di Playground: matikan internet/Groq key salah sengaja untuk
   membuktikan ia pindah ke Gemini (lihat urutan di error bila semua gagal).
6. Ulangi langkah 1–4 untuk 2 flow lainnya (node bisa di-copy antar flow).

## Catatan kuota (pelajaran kemarin)

- Jangan uji berulang-ulang saat kuota tipis — tiap run makan kuota semua
  provider yang dicoba sebelum berhasil.
- Untuk demo: pre-generate + rekam video cadangan tetap wajib.
- Daftar API key yang dipakai: Groq (utama), Gemini (cadangan).
  Composio TIDAK dipakai flow ini — tidak perlu dipasang.
