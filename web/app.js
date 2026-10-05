"use strict";
/* BidMaster front: form terstruktur -> POST /api/draft. Tanpa prompt bebas. */
const $ = id => document.getElementById(id);
const fmt = n => "Rp " + n.toLocaleString("id-ID");
let CAT = null, MD = "";

async function init() {
  const r = await fetch("/api/catalog");
  CAT = await r.json();
  $("paket").replaceChildren(...CAT.packages.map(p => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = `${p.name} — ${fmt(p.price_idr)} / ${p.timeline_weeks} mgg`;
    return o;
  }));
  $("paket").value = "standard";
  syncPaket();
  $("fitur").replaceChildren(...CAT.features.map(f => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = f;
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); syncEst(); };
    return b;
  }));
  document.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => fill(b.dataset.ex));
}
function syncPaket() {
  const p = CAT.packages.find(x => x.id === $("paket").value);
  if (p) { $("dur").value = p.timeline_weeks; $("durHint").textContent = `Bawaan paket ${p.name}: ${p.timeline_weeks} minggu (bisa diubah 1–12).`; }
  syncEst();
}
function picked() {
  return [...$("fitur").children].filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent);
}
function syncEst() {
  const p = CAT.packages.find(x => x.id === $("paket").value);
  const d = Math.max(0, Math.min(10, parseFloat($("disk").value) || 0));
  if (!p) return;
  const total = Math.round(p.price_idr * (100 - d) / 100);
  $("est").textContent = `Estimasi bayar: ${fmt(total)}${d ? ` (diskon ${d}%)` : ""} — ${picked().length} fitur`;
}
function fill(k) {
  const E = { kafe: ["Kafe Arunika", "web + reservasi + galeri menu", "10jt"], klinik: ["Klinik Sehat", "profil + booking + jadwal dokter", "15jt"], batik: ["Batik Laras", "katalog + order WA + blog", "5jt"] }[k];
  $("nama").value = E[0]; $("dok").value = E[1]; $("cat").value = "Budget ±" + E[2];
  $("paket").value = k === "batik" ? "basic" : "standard"; syncPaket();
}
async function readDoc(file) {
  if (!file) return ["", ""];
  if (file.size > 200 * 1024) throw new Error("Dokumen maks 200KB.");
  if (!/text|json|csv|markdown|pdf|msword|officedocument/i.test(file.type) && !/\.(txt|md|csv|json)$/i.test(file.name)) {
    if (!confirm("Format tidak dikenali — kirim sebagai teks mentah?")) return ["", ""];
  }
  const buf = await file.arrayBuffer();
  const txt = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 200 * 1024));
  return [txt, file.name.slice(0, 80)];
}
async function submit() {
  $("err").textContent = "";
  $("go").disabled = true;
  try {
    let dokText = $("dok").value, dokNama = "";
    const f = $("file").files[0];
    if (f) [dokText, dokNama] = await readDoc(f);
    const body = { nama: $("nama").value.trim(), industri: $("ind").value, paket: $("paket").value, durasi_minggu: parseInt($("dur").value, 10), diskon_persen: parseFloat($("disk").value) || 0, fitur: picked(), dokumen_text: dokText, dokumen_nama: dokNama, catatan: $("cat").value.trim() };
    const r = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) {
      $("err").textContent = j.error || "Gagal.";
      if (j.field && $(j.field)) $(j.field).focus();
      return;
    }
    MD = j.markdown;
    $("out").textContent = MD;
    $("pills").replaceChildren(...j.compliance.checks.map(c => {
      const s = document.createElement("span");
      s.className = "pill " + (c.ok ? "ok" : "bad"); s.textContent = (c.ok ? "✓ " : "✗ ") + c.name;
      return s;
    }));
    $("score").textContent = `Compliance ${j.compliance.score.toFixed(0)}% — ${j.compliance.passed ? "LOLOS" : "ADA PELANGGARAN, jangan finalkan"}`;
    $("score").className = j.compliance.passed ? "ok" : "bad";
    $("meta").textContent = `Paket ${j.meta.package} · total ${fmt(j.meta.total)} · ${j.meta.duration_weeks} minggu`;
  } catch (e) { $("err").textContent = e.message || "Jaringan gagal."; }
  finally { $("go").disabled = false; }
}
function dl() {
  if (!MD) { $("err").textContent = "Buat draft dulu."; return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([MD], { type: "text/markdown" }));
  a.download = "draft-proposal.md"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$("paket").onchange = syncPaket; $("disk").oninput = syncEst;
$("go").onclick = submit; $("dl").onclick = dl;
init();
