"use strict";
/**
 * agent.js — Bob Agent chat interface
 * Mengelola percakapan dengan Langflow melalui /api/agent
 */

const $ = id => document.getElementById(id);

// ── State ──────────────────────────────────────────────────────────
let currentFlow = "generate_proposal_draft";
let sessionId = makeSessionId();
let isThinking = false;
let isConfigured = false;
let TOK = (document.cookie.match(/(?:^|;\s*)bm_token=([^;]+)/) || [0, ""])[1] || "";
try { TOK = TOK || sessionStorage.getItem("bm_token") || ""; } catch {}
const authH = () => TOK ? { "Authorization": "Bearer " + TOK } : {};

const THINKING_LABELS = {
  "generate_proposal_draft": "Bob sedang menganalisis dan menyusun proposal…",
  "revise_proposal": "Bob sedang merevisi proposal…",
  "generate_prd_from_brief": "Bob sedang menyusun PRD…",
};

// ── Session ID ────────────────────────────────────────────────────
function makeSessionId() {
  return "bm-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function updateSessionDisplay() {
  const el = $("sessionIdDisplay");
  if (el) el.textContent = sessionId.slice(0, 22) + "…";
}

// ── Auth ──────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const r = await fetch("/api/me", { headers: authH() });
    const who = $("who");
    const loginLink = $("loginLink");
    const logoutBtn = $("logoutBtn");

    if (!r.ok) {
      if (who) who.textContent = "belum login";
      if (loginLink) loginLink.hidden = false;
      if (logoutBtn) logoutBtn.hidden = true;
      // Tampilkan warning bahwa agent butuh login
      showAuthWarning();
      return false;
    }
    const u = await r.json();
    if (who) who.textContent = `${u.nama} (${u.peran})`;
    if (loginLink) loginLink.hidden = true;
    if (logoutBtn) logoutBtn.hidden = false;
    hideAuthWarning();
    return true;
  } catch {
    showAuthWarning();
    return false;
  }
}

function showAuthWarning() {
  const b1 = $("authWarningBanner");
  const b2 = $("authWarningBannerMobile");
  if (b1) b1.hidden = false;
  if (b2) b2.hidden = false;
}

function hideAuthWarning() {
  const b1 = $("authWarningBanner");
  const b2 = $("authWarningBannerMobile");
  if (b1) b1.hidden = true;
  if (b2) b2.hidden = true;
}

// ── Langflow status ───────────────────────────────────────────────
async function checkLangflowStatus() {
  const dot = $("statusDot");
  const txt = $("statusText");
  try {
    const r = await fetch("/api/agent/status");
    if (!r.ok) throw new Error("status error");
    const j = await r.json();
    isConfigured = !!j.configured;
    if (isConfigured) {
      if (dot) dot.className = "status-dot online";
      if (txt) txt.textContent = "Langflow terhubung";
      const banner = $("notConfiguredBanner");
      if (banner) banner.hidden = true;
    } else {
      if (dot) dot.className = "status-dot offline";
      if (txt) txt.textContent = "Langflow tidak terhubung";
      const banner = $("notConfiguredBanner");
      if (banner) banner.hidden = false;
    }
  } catch {
    isConfigured = false;
    if (dot) dot.className = "status-dot offline";
    if (txt) txt.textContent = "Server tidak merespons";
    const banner = $("notConfiguredBanner");
    if (banner) banner.hidden = false;
  }
  setSendEnabled();
}

// ── Send enabled state ────────────────────────────────────────────
function setSendEnabled() {
  const btn = $("sendBtn");
  if (!btn) return;
  const hasText = ($("chatInput")?.value || "").trim().length > 0;
  btn.disabled = !hasText || !isConfigured || isThinking;
}

// ── Markdown renderer (built-in, no external lib) ─────────────────
function renderMarkdown(raw) {
  // Escape HTML entities first
  let s = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`);
  // Inline code
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // Headers
  s = s.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  s = s.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold / italic
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // HR
  s = s.replace(/^---+$/gm, "<hr>");
  // Tables
  s = s.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
    const ths = header.split("|").map(c => c.trim()).filter(Boolean)
      .map(c => `<th>${c}</th>`).join("");
    const trs = rows.trim().split("\n").map(row => {
      const tds = row.split("|").map(c => c.trim()).filter(Boolean)
        .map(c => `<td>${c}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  // Unordered lists
  s = s.replace(/^([ \t]*[-*+] .+)/gm, (m) =>
    `<li>${m.replace(/^[ \t]*[-*+] /, "")}</li>`);
  s = s.replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);
  // Wrap remaining text blocks in paragraphs
  s = s.split(/\n{2,}/).map(block => {
    const t = block.trim();
    if (!t) return "";
    if (/^<(h[1-6]|ul|ol|table|pre|hr)/.test(t)) return t;
    return `<p>${t.replace(/\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n");

  return s;
}

// ── Time ──────────────────────────────────────────────────────────
function timeNow() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ── Add message to chat ───────────────────────────────────────────
function addMessage(role, text, opts = {}) {
  // Remove welcome screen on first real message
  const welcome = $("chatWelcome");
  if (welcome) welcome.remove();

  const isUser = role === "user";
  const isError = opts.error === true;

  const msgEl = document.createElement("div");
  msgEl.className = `msg ${isUser ? "user" : "bot"}`;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = isUser ? "K" : "B";

  const body = document.createElement("div");
  body.className = "msg-body";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble" + (isError ? " error-bubble" : "");

  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = renderMarkdown(text);
  }

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = timeNow();

  body.appendChild(bubble);
  body.appendChild(timeEl);

  // Action buttons on bot messages
  if (!isUser && !isError && text.trim()) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "msg-action-btn";
    copyBtn.textContent = "Salin teks";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Tersalin ✓";
        setTimeout(() => { copyBtn.textContent = "Salin teks"; }, 1500);
      }).catch(() => {
        // Fallback: select text
        const range = document.createRange();
        range.selectNode(bubble);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      });
    };

    const dlBtn = document.createElement("button");
    dlBtn.className = "msg-action-btn";
    dlBtn.textContent = "Unduh .md";
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
      a.download = `output-bob-${Date.now()}.md`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    };

    actions.appendChild(copyBtn);
    actions.appendChild(dlBtn);
    body.appendChild(actions);
  }

  msgEl.appendChild(avatar);
  msgEl.appendChild(body);

  // Insert before typing indicator
  const container = $("chatMessages");
  const typing = $("typingIndicator");
  container.insertBefore(msgEl, typing);
  scrollBottom();
}

// ── Scroll ────────────────────────────────────────────────────────
function scrollBottom() {
  const c = $("chatMessages");
  if (c) c.scrollTop = c.scrollHeight;
}

// ── Typing indicator ──────────────────────────────────────────────
function showTyping(label) {
  const ind = $("typingIndicator");
  const lbl = $("typingLabel");
  const av = $("bobAvatar");
  if (lbl) lbl.textContent = label || "Bob sedang berpikir…";
  if (ind) ind.classList.add("visible");
  if (av) av.classList.add("thinking");
  scrollBottom();
}

function hideTyping() {
  const ind = $("typingIndicator");
  const av = $("bobAvatar");
  if (ind) ind.classList.remove("visible");
  if (av) av.classList.remove("thinking");
}

// ── Send message ──────────────────────────────────────────────────
async function sendMessage() {
  if (isThinking) return;
  const input = $("chatInput");
  const text = (input?.value || "").trim();
  if (!text) return;

  // Validate: must be logged in
  const meResp = await fetch("/api/me", { headers: authH() }).catch(() => null);
  if (!meResp || !meResp.ok) {
    addMessage("bot",
      "**Harus login dulu.**\n\nSilakan [masuk](/login) untuk menggunakan Bob Agent.",
      { error: true });
    showAuthWarning();
    return;
  }

  if (input) input.value = "";
  resizeTextarea();
  addMessage("user", text);
  setThinking(true);
  showTyping(THINKING_LABELS[currentFlow]);

  try {
    const r = await fetch("/api/agent", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, authH()),
      body: JSON.stringify({
        message: text,
        flow: currentFlow,
        session_id: sessionId,
      }),
    });

    const j = await r.json().catch(() => ({}));

    hideTyping();

    if (r.status === 401) {
      showAuthWarning();
      addMessage("bot",
        "**Sesi habis.**\n\nSilakan [masuk kembali](/login) untuk melanjutkan.",
        { error: true });
      return;
    }
    if (r.status === 503) {
      addMessage("bot",
        `**Langflow tidak terhubung.**\n\n${j.error || "Periksa konfigurasi .env dan pastikan Langflow berjalan."}`,
        { error: true });
      return;
    }
    if (!r.ok) {
      addMessage("bot",
        `**Gagal (${r.status}):** ${j.error || "Terjadi kesalahan. Coba ulangi."}`,
        { error: true });
      return;
    }

    addMessage("bot", j.text || "(Tidak ada output dari Langflow)");

  } catch (e) {
    hideTyping();
    addMessage("bot",
      `**Jaringan gagal:** ${e.message || "Periksa koneksi internet."}`,
      { error: true });
  } finally {
    setThinking(false);
    // Re-check enabled state after thinking ends
    setSendEnabled();
  }
}

function setThinking(val) {
  isThinking = val;
  const input = $("chatInput");
  if (input) input.disabled = val;
  setSendEnabled();
}

// ── Textarea auto-resize ──────────────────────────────────────────
function resizeTextarea() {
  const ta = $("chatInput");
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
}

// ── Flow switching ────────────────────────────────────────────────
function switchFlow(flow) {
  currentFlow = flow;
  document.querySelectorAll(".flow-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.flow === flow);
  });
  const lbl = $("activeFlowLabel");
  if (lbl) lbl.textContent = flow;
  updatePromptHints();
}

const FLOW_HINTS = {
  "generate_proposal_draft": [
    "Kafe di Surabaya butuh web + reservasi online, budget 15 juta",
    "Client klinik ingin website dengan appointment online dan galeri dokter",
    "Tender dinas pemerintah, pagu 50 juta, durasi 3 bulan",
    "UMKM fashion butuh toko online + QRIS",
  ],
  "revise_proposal": [
    "Turunkan paket Premium 10%, tetap dalam batas diskon",
    "Tambahkan fitur galeri foto ke paket Standard",
    "Perpanjang timeline 2 minggu untuk fase development",
    "Revisi bagian RAB: tambah komponen pelatihan pengguna",
  ],
  "generate_prd_from_brief": [
    "Buatkan PRD dari proposal kafe yang sudah disetujui",
    "PRD untuk sistem reservasi online klinik",
    "PRD teknis website company profile + blog",
    "PRD untuk sistem e-commerce UMKM fashion",
  ],
};

function updatePromptHints() {
  const container = $("promptHints");
  if (!container) return;
  const hints = FLOW_HINTS[currentFlow] || [];
  container.replaceChildren(
    ...hints.map(h => {
      const b = document.createElement("button");
      b.className = "hint-chip";
      b.type = "button";
      b.textContent = h.length > 50 ? h.slice(0, 48) + "…" : h;
      b.title = h;
      b.onclick = () => {
        const inp = $("chatInput");
        if (inp) {
          inp.value = h;
          resizeTextarea();
          inp.focus();
          setSendEnabled();
        }
      };
      return b;
    })
  );
}

// ── New session ───────────────────────────────────────────────────
function startNewSession() {
  sessionId = makeSessionId();
  updateSessionDisplay();
  const msgs = $("chatMessages");
  if (msgs) {
    msgs.innerHTML = `
      <div class="chat-welcome" id="chatWelcome">
        <div class="welcome-avatar">B</div>
        <h3>Sesi baru dimulai.</h3>
        <p>Riwayat percakapan sebelumnya tidak diteruskan ke Langflow. Ceritakan kebutuhan baru.</p>
      </div>`;
  }
}

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  updateSessionDisplay();

  // Bind flow buttons
  document.querySelectorAll(".flow-btn").forEach(b => {
    b.addEventListener("click", () => switchFlow(b.dataset.flow));
  });

  // New session
  const newSessBtn = $("newSessionBtn");
  if (newSessBtn) newSessBtn.addEventListener("click", startNewSession);

  // Input events
  const input = $("chatInput");
  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener("input", () => {
      resizeTextarea();
      setSendEnabled();
    });
  }

  // Send button
  const sendBtn = $("sendBtn");
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);

  // Logout
  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST", headers: authH() }).catch(() => {});
      TOK = "";
      try { sessionStorage.removeItem("bm_token"); } catch {}
      document.cookie = "bm_token=; Path=/; Max-Age=0; SameSite=Strict";
      location.href = "/login";
    });
  }

  // Check auth & Langflow status in parallel
  await Promise.all([checkAuth(), checkLangflowStatus()]);

  // Init hints
  updatePromptHints();
}

init();
