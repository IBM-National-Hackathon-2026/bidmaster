# Panduan Import Flow ke Langflow (5 menit per flow)

File siap import ada di `flows/`:
- `10_generate_proposal_draft.json` → MCP tool `generate_proposal_draft`
- `11_revise_proposal.json` → MCP tool `revise_proposal`
- `20_generate_prd_from_brief.json` → MCP tool `generate_prd_from_brief`

## 0. Catatan versi (penting)
File ini dibangun meniru struktur export asli Langflow (referensi starter `Simple Agent`,
skema `name → data{nodes, edges, viewport}`). Jika saat upload masih muncul
`error uploading file ... reading 'join'`:
1. Cek versi Langflow kamu (pojok → Settings/About) dan samakan dengan panitia bila diminta.
2. Alternatif: import via API yang pesan error-nya lebih jelas:
   `POST {LANGFLOW_URL}/api/v1/flows/upload/` dengan header `x-api-key`, body file JSON.
3. Bila tetap gagal, cara paling aman: buat manual 3 node di canvas
   (Chat Input → Agent → Chat Output, hubungkan message→input_value dan
   response→input_value), lalu copy-paste system prompt dari `SKILL.md`
   (proposal §2.6, revisi §3, PRD §4) ke field System Prompt Agent.

## 1. Import
Pilih salah satu:
- **Drag-drop** file JSON ke jendela Langflow, atau
- Projects → **Upload a flow** → pilih file.

Ulangi untuk 3 file (boleh dalam 1 Project agar 1 MCP endpoint menaungi semua tools).

## 2. Wajib setelah import (per flow)
1. Klik komponen **Agent** → bagian **Model**: pilih `Google Generative AI` / `gemini-2.5-flash`
   (file sudah mengusulkan nilainya, tapi verifikasi — beda versi Langflow beda tampilan).
2. Isi **API Key**: tempel Gemini key (`aistudio.google.com/api-keys`),
   atau kosongkan di sini dan isi via Settings → Model Providers / Global Variables.
3. Klik **Playground**, kirim contoh input:
   - Proposal: `Client kafe di Surabaya Timur, mau web + reservasi online, budget sekitar 10jt`
   - Revisi: tempel draft + `Tambahkan fitur galeri menu di paket Standard`
   - PRD: `Buatkan PRD untuk website kafe dengan reservasi online`
4. Pastikan **Chat Output** keluar benar (proposal 9 bab + compliance / revisi + diff / PRD).
   Hasil harus mirip `output/proposal_v1.md` dari simulator.

## 3. Expose via MCP
1. Di Project Langflow → **MCP Server → JSON → Generate API Key**.
2. Salin JSON + key (key muncul 1x, simpan di `.env`, JANGAN commit).
   Contoh struktur di `mcp.json.example`.

## 4. Sambung ke Bob
Bob → **Gear → MCP → +** → tempel JSON → tambah di `args`: `--with`, `mcp<2.0.0` → verifikasi 3 tools muncul → uji prompt natural.

## 5. Setelah diubah di canvas
Re-export dari Langflow dan timpa file di `flows/` agar git selalu sinkron dengan versi jalan.
