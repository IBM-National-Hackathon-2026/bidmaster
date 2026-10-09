"use strict";
const $ = id => document.getElementById(id);

// Tentukan ke mana redirect setelah login
// Jika datang dari /agent, kembali ke /agent; default ke /app
const _ref = document.referrer;
const AFTER_LOGIN = (_ref && new URL(_ref).pathname === "/agent") ? "/agent" : "/app";

function setFieldError(id, msg) {
  const el = $(id);
  if (el) {
    el.setAttribute("aria-invalid", "true");
    el.classList.add("is-invalid");
  }
  $("err").textContent = msg;
  $("err").hidden = !msg;
}

function clearErrors() {
  $("err").textContent = "";
  $("err").hidden = true;
  [$("user"), $("pw")].forEach(el => {
    if (el) {
      el.removeAttribute("aria-invalid");
      el.classList.remove("is-invalid");
    }
  });
}

$("lf").onsubmit = async () => {
  clearErrors();
  const nama = $("user").value.trim();
  const pw = $("pw").value;

  // Validasi input
  if (!nama) {
    setFieldError("user", "Nama pengguna tidak boleh kosong.");
    $("user").focus();
    return;
  }
  if (nama.length < 2) {
    setFieldError("user", "Nama pengguna minimal 2 karakter.");
    $("user").focus();
    return;
  }
  if (!pw) {
    setFieldError("pw", "Kata sandi tidak boleh kosong.");
    $("pw").focus();
    return;
  }
  if (pw.length < 4) {
    setFieldError("pw", "Kata sandi terlalu pendek.");
    $("pw").focus();
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "Memeriksa…";
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, pw })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      $("err").textContent = j.error || "Nama atau kata sandi salah.";
      $("err").hidden = false;
      $("pw").value = "";
      $("pw").focus();
      return;
    }
    // Simpan token ke sessionStorage sebagai fallback
    if (j.token) {
      try { sessionStorage.setItem("bm_token", j.token); } catch {}
    }
    location.href = AFTER_LOGIN;
  } catch {
    $("err").textContent = "Jaringan gagal. Periksa koneksi dan coba lagi.";
    $("err").hidden = false;
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Masuk";
  }
};

// Real-time validation: hapus error saat user mulai mengetik
$("user").addEventListener("input", clearErrors);
$("pw").addEventListener("input", clearErrors);

// Redirect if already logged in
fetch("/api/me").then(r => { if (r.ok) location.href = AFTER_LOGIN; }).catch(() => {});
