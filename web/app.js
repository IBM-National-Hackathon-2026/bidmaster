"use strict";
/* BidMaster front: form terstruktur -> POST /api/draft|/api/export. Tanpa prompt bebas. */
const $ = id => document.getElementById(id);
const fmt = n => "Rp " + n.toLocaleString("id-ID");
let CAT = null, MD = "", LAST = null;
const HKEY = "bidmaster-history-v1";

async function init() {
  const r = await fetch("/api/catalog");
  CAT = await r.json();
  $("ind").replaceChildren(...CAT.industries.map(i => { const o = document.createElement("option"); o.textContent = i; return o; }));
  $("diskMax").textContent = CAT.discount_max;
  $("disk").max = CAT.discount_max;
  $("paket").replaceChildren(...CAT.website.packages.map(p => { const o = document.createElement("option"); o.value = p.id; o.textContent = `${p.name} — ${fmt(p.price_idr)} / ${p.timeline_weeks} mgg`; return o; }));
  $("paket").value = "standard";
  $("fitur").replaceChildren(...CAT.website.features.map(f => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = f; b.setAttribute("aria-pressed", "false"); b.onclick = () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); syncEst(); }; return b; }));
  $("komp").replaceChildren(...CAT.tender.komponen.map(k => {
    const tr = document.createElement("tr");
    [k.kode, k.nama, k.satuan, fmt(k.harga_dasar)].forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.append(td); });
    const td = document.createElement("td"), inp = document.createElement("input");
    inp.type = "number"; inp.min = "0"; inp.max = "1000"; inp.value = "0"; inp.dataset.kode = k.kode; inp.setAttribute("aria-label", "Qty " + k.kode); inp.style.maxWidth = "90px";
    td.append(inp); tr.append(td); return tr;
  }));
  document.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => fill(b.dataset.ex));
  syncMode(); renderHist();
}
function mode() { return $("mode").value; }
function syncMode() {
  const t = mode() === "tender";
  $("webBox").hidden = t; $("fitCard").hidden = t; $("tenBox").hidden = !t;
  if (t) { $("nama").placeholder = "Dinas Pelayanan Publik Kota Arunika"; } else { $("nama").placeholder = "Kafe Arunika"; syncPaket(); }
}
function syncPaket() {
  const p = CAT.website.packages.find(x => x.id === $("paket").value);
  if (p) { $("dur").value = p.timeline_weeks; $("durHint").textContent = `Bawaan paket ${p.name}: ${p.timeline_weeks} minggu (bisa diubah 1–12).`; }
  syncEst();
}
function picked() { return [...$("fitur").children].filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent); }
function komps() { return [...$("komp").querySelectorAll("input")].map(i => ({ kode: i.dataset.kode, qty: parseInt(i.value, 10) || 0 })).filter(x => x.qty > 0); }
function syncEst() {
  const p = CAT.website.packages.find(x => x.id === $("paket").value);
  if (!p) return;
  const d = Math.max(0, Math.min(CAT.discount_max, parseFloat($("disk").value) || 0));
  const total = Math.round(p.price_idr * (100 - d) / 100);
  $("est").textContent = `Estimasi bayar: ${fmt(total)}${d ? ` (diskon ${d}%)` : ""} — ${picked().length} fitur`;
}
function fill(k) {
  if (k === "tender") { $("mode").value = "tender"; syncMode(); $("nama").value = "Dinas Pelayanan Publik Kota Arunika"; $("ind").value = "Pemerintahan"; return; }
  if (mode() !== "website") { $("mode").value = "website"; syncMode(); }
  const E = { kafe: ["Kafe Arunika", "web + reservasi + galeri menu", "Budget ±10jt"], klinik: ["Klinik Sehat", "profil + booking + jadwal dokter", "Budget ±15jt"], batik: ["Batik Laras", "katalog + order WA + blog", "Budget ±5jt"] }[k];
  $("nama").value = E[0]; $("dok").value = E[1]; $("cat").value = E[2];
  $("paket").value = k === "batik" ? "basic" : "standard"; syncPaket();
}
async function readDoc(file) {
  if (!file) return ["", ""];
  if (file.size > 200 * 1024) throw new Error("Dokumen maks 200KB.");
  if (!/text|json|csv|markdown|pdf|msword|officedocument/i.test(file.type) && !/\.(txt|md|csv|json)$/i.test(file.name)) {
    if (!confirm("Format tidak dikenali — kirim sebagai teks mentah?")) return ["", ""];
  }
  const buf = await file.arrayBuffer();
  return [new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 200 * 1024)), file.name.slice(0, 80)];
}
async function submit() {
  $("err").textContent = ""; $("go").disabled = true;
  try {
    let dokText = $("dok").value, dokNama = "";
    const f = $("file").files[0];
    if (f) [dokText, dokNama] = await readDoc(f);
    const t = mode() === "tender";
    const body = { mode: t ? "tender" : "website", nama: $("nama").value.trim(), industri: $("ind").value, durasi_minggu: parseInt($("dur").value || (t ? 12 : 4), 10), diskon_persen: t ? 0 : (parseFloat($("disk").value) || 0), dokumen_text: dokText, dokumen_nama: dokNama, catatan: $("cat").value.trim() };
    if (t) { const ks = komps(); if (!ks.length) { $("err").textContent = "Isi qty minimal 1 komponen."; $("komp").querySelector("input").focus(); return; } body.komponen = ks; }
    else { body.paket = $("paket").value; body.fitur = picked(); }
    const r = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { $("err").textContent = j.error || "Gagal."; const m = { nama: "nama", paket: "paket", dur: "dur", disk: "disk", fitur: "fitur", ind: "ind", komp: "komp", dok: "dok" }; if (j.field && m[j.field] && $(m[j.field])) $(m[j.field]).focus(); return; }
    MD = j.markdown; LAST = { t: Date.now(), nama: body.nama, mode: j.meta.mode, total: j.meta.total, score: j.compliance.score, md: MD };
    $("out").textContent = MD;
    $("pills").replaceChildren(...j.compliance.checks.map(c => { const s = document.createElement("span"); s.className = "pill " + (c.ok ? "ok" : "bad"); s.textContent = (c.ok ? "✓ " : "✗ ") + c.name; return s; }));
    $("score").textContent = `Compliance ${j.compliance.score.toFixed(0)}% — ${j.compliance.passed ? "LOLOS" : "ADA PELANGGARAN, jangan finalkan"}`;
    $("score").className = j.compliance.passed ? "ok" : "bad";
    $("meta").textContent = `${j.meta.package} · total ${fmt(j.meta.total)} · ${j.meta.duration_weeks} minggu`;
    saveHist();
  } catch (e) { $("err").textContent = e.message || "Jaringan gagal."; }
  finally { $("go").disabled = false; }
}
function dl(ext) {
  if (!MD) { $("err").textContent = "Buat draft dulu."; return; }
  if (ext === "md") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([MD], { type: "text/markdown" })); a.download = "draft-proposal.md"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
}
async function dx() {
  if (!MD) { $("err").textContent = "Buat draft dulu."; return; }
  const r = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "docx", markdown: MD }) });
  if (!r.ok) { $("err").textContent = (await r.json()).error || "Export gagal."; return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = "draft-proposal.docx"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function loadH() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } }
function saveHist() {
  const h = [{ t: LAST.t, nama: LAST.nama, mode: LAST.mode, total: LAST.total, score: LAST.score, md: LAST.md }, ...loadH()].slice(0, 20);
  try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch { $("err").textContent = "Riwayat penuh — hapus riwayat dulu."; return; }
  renderHist();
}
function renderHist() {
  const h = loadH();
  if (!h.length) { $("hist").textContent = "Belum ada."; return; }
  $("hist").replaceChildren(...h.map((x, i) => {
    const d = document.createElement("div");
    const b = document.createElement("button"); b.type = "button"; b.className = "ghost";
    b.textContent = `${new Date(x.t).toLocaleString("id-ID")} — ${x.nama} — ${fmt(x.total)} — ${x.score.toFixed(0)}%`;
    b.onclick = () => { MD = x.md; $("out").textContent = MD; window.scrollTo(0, $("out").offsetTop - 80); };
    const del = document.createElement("button"); del.type = "button"; del.className = "ghost"; del.textContent = "✕"; del.setAttribute("aria-label", "Hapus item " + (i + 1));
    del.onclick = () => { const n = loadH(); n.splice(i, 1); try { localStorage.setItem(HKEY, JSON.stringify(n)); } catch {} renderHist(); };
    d.append(b, del); return d;
  }));
}
$("mode").onchange = syncMode; $("paket").onchange = syncPaket; $("disk").oninput = syncEst;
$("go").onclick = submit; $("dl").onclick = () => dl("md"); $("dx").onclick = dx;
$("pr").onclick = () => { if (!MD) { $("err").textContent = "Buat draft dulu."; return; } window.print(); };
$("wipe").onclick = () => { localStorage.removeItem(HKEY); renderHist(); };
init();
