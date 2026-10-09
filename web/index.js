fetch("/api/me").then(r => r.ok ? r.json() : null).then(u => {
  if (u) {
    document.getElementById("who").textContent = u.nama + " (" + u.peran + ")";
    document.getElementById("loginLink").hidden = true;
    document.getElementById("appLink").hidden = false;
  }
}).catch(() => {});
