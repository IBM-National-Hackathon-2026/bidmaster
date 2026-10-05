"""Auth + audit trail stdlib (sqlite3). Login tim internal, peran, log aktivitas.

Tabel: users(id, nama, peran, salt, hash) | sessions(token, uid, exp) |
audit(ts, uid, aksi, detail). Seed: admin/bidmaster123 (ganti via env SEED_ADMIN_PASS).
"""
import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "data.db"
SESSION_H = 12 * 3600
PERAN = {"admin", "bd", "reviewer", "viewer"}


def _db():
    fresh = not DB.exists()
    c = sqlite3.connect(DB)
    c.execute("PRAGMA journal_mode=WAL")
    if fresh:
        c.executescript("""CREATE TABLE users(id INTEGER PRIMARY KEY, nama TEXT UNIQUE NOT NULL,
          peran TEXT NOT NULL, salt BLOB NOT NULL, hash BLOB NOT NULL);
          CREATE TABLE sessions(token TEXT PRIMARY KEY, uid INTEGER NOT NULL, exp INTEGER NOT NULL);
          CREATE TABLE audit(ts INTEGER NOT NULL, uid INTEGER, aksi TEXT NOT NULL, detail TEXT);""")
        seed(c)
    return c


def _hash(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)


def seed(c):
    pw = os.environ.get("SEED_ADMIN_PASS", "bidmaster123")
    s = secrets.token_bytes(16)
    c.execute("INSERT OR IGNORE INTO users(nama, peran, salt, hash) VALUES(?,?,?,?)",
              ("admin", "admin", s, _hash(pw, s)))
    c.commit()


def login(nama, pw):
    c = _db()
    r = c.execute("SELECT id, peran, salt, hash FROM users WHERE nama=?", (str(nama)[:40],)).fetchone()
    if not r or not hmac.compare_digest(_hash(str(pw), r[2]), r[3]):
        return None
    t = secrets.token_urlsafe(32)
    c.execute("INSERT INTO sessions VALUES(?,?,?)", (t, r[0], int(time.time()) + SESSION_H))
    c.execute("INSERT INTO audit VALUES(?,?,?,?)", (int(time.time()), r[0], "login", ""))
    c.commit()
    c.close()
    return {"token": t, "nama": r[0] and str(nama)[:40], "peran": r[1]}


def who(token):
    c = _db()
    r = c.execute("SELECT u.id, u.nama, u.peran, s.exp FROM sessions s JOIN users u ON u.id=s.uid "
                  "WHERE s.token=?", (token or "",)).fetchone()
    c.close()
    if not r or r[3] < time.time():
        return None
    return {"id": r[0], "nama": r[1], "peran": r[2]}


def logout(token):
    c = _db()
    c.execute("DELETE FROM sessions WHERE token=?", (token or "",))
    c.commit()
    c.close()


def audit(uid, aksi, detail=""):
    c = _db()
    c.execute("INSERT INTO audit VALUES(?,?,?,?)", (int(time.time()), uid, aksi, detail[:500]))
    c.commit()
    c.close()


def history(uid, n=50):
    c = _db()
    rows = c.execute("SELECT ts, aksi, detail FROM audit WHERE uid=? OR ? IS NULL "
                     "ORDER BY ts DESC LIMIT ?", (uid, uid, n)).fetchall()
    c.close()
    return [{"ts": t, "aksi": a, "detail": d} for t, a, d in rows]


if __name__ == "__main__":
    assert login("admin", "salah") is None, "login salah harus gagal"
    s = login("admin", os.environ.get("SEED_ADMIN_PASS", "bidmaster123"))
    assert s and who(s["token"])["peran"] == "admin", "login benar harus lolos"
    logout(s["token"])
    assert who(s["token"]) is None, "logout harus matikan sesi"
    print("auth-ok")
