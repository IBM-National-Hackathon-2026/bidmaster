"use strict";
/* BidMaster: /app wizard tender -> POST /api/draft|/api/export. Login di /login.
   Token sesi dibaca dari cookie (fallback memory) agar pindah halaman tetap login. */
const $ = id => document.getElementById(id);
const fmt = n => "Rp " + n.toLocaleString("id-ID");
let CAT = null, MD = "", LAST = null;
let TOK = (document.cookie.match(/(?:^|;\s*)bm_token=([^;]+)/) || [0, ""])[1] || "";
try { TOK = TOK || sessionStorage.getItem("bm_token") || ""; } catch {}
const HKEY = "bidmaster-history-v1";
const authH = () => TOK ? { "Authorization": "Bearer " + TOK } : {};
const PRICE = k => (CAT.tender.komponen.find(x => x.kode === k) || {}).harga_dasar || 0;

async function init() {
  const r = await fetch("/api/catalog");
  CAT = await r.json();
  $("ind").replaceChildren(...CAT.industries.map(i => { const o = document.createElement("option"); o.textContent = i; return o; }));
  $("ind").value = "Pemerintahan";
  $("diskMax").textContent = CAT.discount_max;
  $("disk").max = CAT.discount_max;
  $("paket").replaceChildren(...CAT.website.packages.map(p => { const o = document.createElement("option"); o.value = p.id; o.textContent = `${p.name} — ${fmt(p.price_idr)} / ${p.timeline_weeks} mgg`; return o; }));
  $("paket").value = "standard";
  $("fitur").replaceChildren(...CAT.website.features.map(f => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = f; b.setAttribute("aria-pressed", "false"); b.onclick = () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); syncEst(); }; return b; }));
  $("komp").replaceChildren(...CAT.tender.komponen.map(k => {
    const tr = document.createElement("tr");
    [k.kode, k.nama, k.satuan, fmt(k.harga_dasar)].forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.append(td); });
    const td = document.createElement("td"), inp = document.createElement("input");
    inp.type = "number"; inp.min = "0"; inp.max = "1000"; inp.value = "0"; inp.dataset.kode = k.kode;
    inp.className = "form-control form-control-sm";
    inp.setAttribute("aria-label", "Qty " + k.kode + " (" + k.nama + ", " + k.satuan + ")");
    inp.oninput = syncTotals;
    td.append(inp); tr.append(td);
    const st = document.createElement("td"); st.dataset.sub = k.kode; st.textContent = "—"; tr.append(st);
    return tr;
  }));
  document.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => fill(b.dataset.ex));
  document.querySelectorAll(".steps-list a, .steps a").forEach(a => { a.onclick = () => setStep(a.dataset.st); });
  $("pagu").oninput = syncTotals;
  $("dok").oninput = syncKak;
  syncMode(); syncTotals(); syncKak(); renderHist(); me();
}
function mode() { return $("mode").value; }
function setStep(id) {
  document.querySelectorAll(".steps-list a, .steps a").forEach(a => a.getAttribute("data-st") === id ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current"));
}
function syncMode() {
  const t = mode() === "tender";
  $("webBox").hidden = t; $("fitCard").hidden = t; $("tenBox").hidden = !t;
  if (t) { $("nama").placeholder = "Dinas Pelayanan Publik Kota Arunika"; if (!$("dur").value) $("dur").value = 12; }
  else { $("nama").placeholder = "Kafe Arunika (demo)"; syncPaket(); }
  syncTotals();
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
  if (!p || mode() !== "website") return;
  const d = Math.max(0, Math.min(CAT.discount_max, parseFloat($("disk").value) || 0));
  const total = Math.round(p.price_idr * (100 - d) / 100);
  $("est").textContent = `Estimasi bayar: ${fmt(total)}${d ? ` (diskon ${d}%)` : ""} — ${picked().length} fitur`;
  $("estTotal").textContent = fmt(total);
  $("estPagu").textContent = "—";
  $("estState").textContent = `${picked().length} fitur dipilih`;
}
function syncTotals() {
  if (!CAT || mode() !== "tender") { if (CAT && mode() === "website") syncEst(); return; }
  let total = 0, n = 0;
  $("komp").querySelectorAll("input").forEach(i => {
    const q = Math.max(0, parseInt(i.value, 10) || 0);
    const sub = PRICE(i.dataset.kode) * q;
    total += sub; if (q) n++;
    const cell = $("komp").querySelector(`[data-sub="${i.dataset.kode}"]`);
    if (cell) cell.textContent = q ? fmt(sub) : "—";
  });
  const pagu = parseInt($("pagu").value || 0, 10);
  $("estTotal").textContent = fmt(total);
  $("estPagu").textContent = pagu ? fmt(pagu) : "tanpa pagu";
  $("estState").textContent = n === 0 ? "Isi qty minimal 1 komponen" : (pagu && total > pagu ? "⚠ Total LEWAT pagu — gate BLOKIR" : `${n} komponen · aman dari pagu`);
  $("estState").className = (pagu && total > pagu) ? "bad" : "";
}
function syncKak() {
  const n = $("dok").value.split(/[\n;,]+/).map(s => s.trim()).filter(s => s.length >= 8).length;
  $("kakHint").textContent = n ? `${n} baris KAK terdeteksi — tiap baris harus cocok 1 komponen.` : "Belum ada baris KAK.";
}
function fill(k) {
  clearInvalid();
  if (k === "tender") {
    $("mode").value = "tender"; syncMode();
    $("nama").value = "Dinas Pelayanan Publik Kota Arunika"; $("ind").value = "Pemerintahan";
    $("pagu").value = 20000000; $("dur").value = 12;
    $("nib").value = "8120101234567"; $("npwp").value = "01.234.567.8-901.000"; $("akta").value = "No. 12/2021 Notaris Arunika";
    $("dok").value = "Pengembangan backend API\nPengujian aplikasi\nPelatihan pengguna";
    const q = { "DEV-BE": 10, "QA": 5, "TRAIN": 2 };
    $("komp").querySelectorAll("input").forEach(i => { i.value = q[i.dataset.kode] || 0; });
    syncTotals(); syncKak(); setStep("s3");
    return;
  }
  $("mode").value = "website"; syncMode();
  $("nama").value = "Kafe Arunika (demo)"; $("dok").value = "web + reservasi + galeri menu"; $("cat").value = "Demo internal";
  $("paket").value = "standard"; syncPaket();
}
function showErr(msg) { const e = $("err"); if (!e) return; e.textContent = msg; e.hidden = !msg; }
function clearInvalid() {
  showErr("");
  document.querySelectorAll("[aria-invalid]").forEach(el => { el.removeAttribute("aria-invalid"); el.classList.remove("is-invalid"); });
}
function markInvalid(id) { const el = $(id); if (el) { el.setAttribute("aria-invalid", "true"); el.classList.add("is-invalid"); el.focus(); } }
async function me() {
  try {
    const r = await fetch("/api/me", { headers: authH() });
    if (!r.ok) throw 0;
    const u = await r.json();
    $("who").textContent = `${u.nama} (${u.peran})`;
    $("sessBar").hidden = true;
    $("loginLink").hidden = true; $("logoutBtn").hidden = false; setStep("s2");
  } catch {
    $("who").textContent = "belum login";
    $("sessBar").hidden = false;
    $("loginLink").hidden = false; $("logoutBtn").hidden = true; setStep("s2");
  }
}
async function doLogout() {
  await fetch("/api/logout", { method: "POST", headers: authH() });
  TOK = "";
  try { sessionStorage.removeItem("bm_token"); } catch {}
  document.cookie = "bm_token=; Path=/; Max-Age=0; SameSite=Strict";
  me();
}
async function readDoc(file) {
  if (!file) return ["", ""];
  if (file.size > 200 * 1024) throw new Error("Dokumen KAK maks 200KB.");
  if (!/text|json|csv|markdown|pdf|msword|officedocument/i.test(file.type) && !/\.(txt|md|csv|json)$/i.test(file.name)) {
    if (!confirm("Format tidak dikenali — kirim sebagai teks mentah?")) return ["", ""];
  }
  const buf = await file.arrayBuffer();
  return [new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 200 * 1024)), file.name.slice(0, 80)];
}
async function submit() {
  clearInvalid(); $("go").disabled = true;
  try {
    let dokText = $("dok").value, dokNama = "";
    const f = $("file").files[0];
    if (f) [dokText, dokNama] = await readDoc(f);
    const t = mode() === "tender";
    const body = { mode: t ? "tender" : "website", nama: $("nama").value.trim(), industri: $("ind").value, durasi_minggu: parseInt($("dur").value || (t ? 12 : 4), 10), diskon_persen: t ? 0 : (parseFloat($("disk").value) || 0), pagu: parseInt($("pagu").value || 0, 10), dokumen_text: dokText, dokumen_nama: dokNama, catatan: $("cat").value.trim(), legal: { nib: $("nib").value.trim(), npwp: $("npwp").value.trim(), akta: $("akta").value.trim() } };
    if (!body.nama || body.nama.length < 2) { showErr("Nama instansi minimal 2 karakter."); markInvalid("nama"); return; }
    if (t) { const ks = komps(); if (!ks.length) { showErr("Isi qty minimal 1 komponen pada Langkah 3."); setStep("s3"); markInvalid("komp"); const i = $("komp").querySelector("input"); if (i) i.focus(); return; } body.komponen = ks; }
    else {
      body.paket = $("paket").value; body.fitur = picked();
      if (!body.fitur.length) { showErr("Pilih minimal 1 fitur."); return; }
    }
    const r = await fetch("/api/draft", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, authH()), body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) {
      showErr(j.error || "Gagal.");
      const m = { nama: "nama", paket: "paket", dur: "dur", disk: "disk", fitur: "fitur", ind: "ind", komp: "komp", dok: "dok", pagu: "pagu" };
      if (r.status === 401) { location.href = "/login"; return; }
      else if (j.field && m[j.field]) markInvalid(m[j.field]);
      return;
    }
    MD = j.markdown; LAST = { t: Date.now(), nama: body.nama, mode: j.meta.mode, total: j.meta.total, score: j.compliance.score, md: MD };
    $("out").textContent = MD;
    $("pills").replaceChildren(...j.compliance.checks.map(c => { const s = document.createElement("span"); s.className = "pill " + (c.ok ? "ok" : "bad"); s.textContent = (c.ok ? "✓ " : "✗ ") + c.name; return s; }));
    const blocked = j.korporat && j.korporat.gate && !j.korporat.gate.passed;
    $("score").textContent = `Compliance ${j.compliance.score.toFixed(0)}% — ${blocked ? "BLOKIR GATE, jangan finalkan" : (j.compliance.passed ? "LOLOS" : "ADA PELANGGARAN, jangan finalkan")}`;
    $("score").className = (!blocked && j.compliance.passed) ? "ok" : "bad";
    $("meta").textContent = `${j.meta.package} · total ${fmt(j.meta.total)} · ${j.meta.duration_weeks} minggu` + (j.korporat.pagu ? ` · pagu ${fmt(j.korporat.pagu)}` : "");
    $("gate").replaceChildren();
    if (j.korporat) {
      const k = j.korporat;
      const box = document.createElement("div");
      box.className = "gatebox " + (k.gate.passed ? "pass" : "block");
      const cov = k.kak.length ? `${k.kak.filter(x => x.cocok).length}/${k.kak.length} kebutuhan KAK terpetakan` : "KAK kosong — tempel dokumen KAK";
      const p = document.createElement("p");
      p.textContent = `Gate korporat: ${k.gate.passed ? "LOLOS ✓" : "BLOKIR ⛔"} · ${cov}` + (k.missing_legal.length ? ` · legal kurang: ${k.missing_legal.join(", ")}` : " · legal lengkap");
      p.className = k.gate.passed ? "ok" : "bad";
      box.append(p);
      k.gate.blocks.forEach(b => { const d = document.createElement("div"); d.textContent = "⛔ " + b; d.className = "bad"; box.append(d); });
      (k.uncovered || []).slice(0, 5).forEach(u => { const d = document.createElement("div"); d.textContent = "• KAK tak terpetakan: " + u.slice(0, 120); box.append(d); });
      $("gate").append(box);
    }
    setStep("s5");
    document.getElementById("s5").scrollIntoView({ behavior: "smooth", block: "start" });
    saveHist();
  } catch (e) { showErr(e.message || "Jaringan gagal."); }
  finally { $("go").disabled = false; }
}
function dl() {
  if (!MD) { showErr("Buat draft dulu (Langkah 5 masih kosong)."); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([MD], { type: "text/markdown" })); a.download = "draft-proposal.md"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function dx() {
  if (!MD) { showErr("Buat draft dulu (Langkah 5 masih kosong)."); return; }
  $("dx").disabled = true;
  try {
    const r = await fetch("/api/export", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, authH()), body: JSON.stringify({ format: "docx", markdown: MD }) });
    if (!r.ok) { showErr((await r.json()).error || "Export gagal."); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = "draft-proposal.docx"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } finally { $("dx").disabled = false; }
}
async function showAudit() {
  const r = await fetch("/api/audit", { headers: authH() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { showErr(j.error || "Gagal."); return; }
  $("audit").replaceChildren(...j.audit.slice(0, 20).map(x => { const d = document.createElement("div"); d.textContent = `${new Date(x.ts * 1000).toLocaleString("id-ID")} — ${x.aksi} — ${x.detail}`; return d; }));
}
function loadH() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } }
function saveHist() {
  const h = [{ t: LAST.t, nama: LAST.nama, mode: LAST.mode, total: LAST.total, score: LAST.score, md: LAST.md }, ...loadH()].slice(0, 20);
  try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch { showErr("Riwayat penuh — hapus riwayat dulu."); return; }
  renderHist();
}
function renderHist() {
  const h = loadH();
  if (!h.length) { $("hist").textContent = "Belum ada."; return; }
  $("hist").replaceChildren(...h.map((x, i) => {
    const d = document.createElement("div");
    const b = document.createElement("button"); b.type = "button"; b.className = "ghost";
    b.textContent = `${new Date(x.t).toLocaleString("id-ID")} — ${x.nama} — ${fmt(x.total)} — ${x.score.toFixed(0)}%`;
    b.onclick = () => { MD = x.md; $("out").textContent = MD; setStep("s5"); document.getElementById("s5").scrollIntoView({ behavior: "smooth" }); };
    const del = document.createElement("button"); del.type = "button"; del.className = "ghost"; del.textContent = "✕"; del.setAttribute("aria-label", "Hapus item " + (i + 1));
    del.onclick = () => { const n = loadH(); n.splice(i, 1); try { localStorage.setItem(HKEY, JSON.stringify(n)); } catch {} renderHist(); };
    d.append(b, del); return d;
  }));
}
$("mode").onchange = syncMode; $("paket").onchange = syncPaket; $("disk").oninput = syncEst;
if ($("logoutBtn")) $("logoutBtn").onclick = doLogout;
$("go").onclick = submit; $("dl").onclick = dl; $("dx").onclick = dx;
$("pr").onclick = () => { if (!MD) { showErr("Buat draft dulu (Langkah 5 masih kosong)."); return; } window.print(); };
$("wipe").onclick = () => { localStorage.removeItem(HKEY); renderHist(); };
$("auditBtn").onclick = showAudit;
init();
