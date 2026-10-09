"""Langflow HTTP client untuk BidMaster.

Memanggil Langflow Run API langsung (tanpa MCP) dari web server.
Endpoint: POST {LANGFLOW_URL}/api/v1/run/{flow}?stream=false
{flow} bisa berupa endpoint_name atau flow ID (baca dari env LANGFLOW_FLOW).

Variabel env yang diperlukan:
    LANGFLOW_URL     — base URL Langflow, mis. http://127.0.0.1:7860
    LANGFLOW_API_KEY — API key dari Langflow Project
    LANGFLOW_FLOW    — endpoint/ID flow aktif (default: generate_proposal_draft)

Env dibaca per panggilan (bukan saat import) agar ganti .env cukup
dengan restart server, bukan restart proses import. Jika URL/key kosong,
is_configured() mengembalikan False dan caller wajib 503 ke browser.
"""
import json
import os
import urllib.error
import urllib.request
from typing import Optional

# Timeout dalam detik — Langflow bisa lambat saat cold start
_TIMEOUT = 120


def _cfg():
    url = os.getenv("LANGFLOW_URL", "").rstrip("/")
    return url, os.getenv("LANGFLOW_API_KEY", ""), \
        os.getenv("LANGFLOW_FLOW", "generate_proposal_draft").strip() or \
        "generate_proposal_draft"


def flow_id() -> str:
    """Endpoint/ID flow aktif dari env (untuk /api/agent/status)."""
    return _cfg()[2]


def is_configured() -> bool:
    """True jika LANGFLOW_URL dan LANGFLOW_API_KEY sudah diisi."""
    url, key, _ = _cfg()
    return bool(url and key)


def _run(flow_endpoint: str, message: str, session_id: str = "") -> dict:
    """Panggil Langflow Run API dan kembalikan dict hasil.

    Mengembalikan:
        {"ok": True, "text": "<output teks>"}
    atau
        {"ok": False, "error": "<pesan error>"}
    """
    url_base, key, _ = _cfg()
    url = f"{url_base}/api/v1/run/{flow_endpoint}?stream=false"
    payload = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
    }
    if session_id:
        payload["session_id"] = session_id

    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read()).get("detail", e.reason)
        except Exception:
            detail = e.reason
        return {"ok": False, "error": f"Langflow HTTP {e.code}: {detail}"}
    except urllib.error.URLError as e:
        return {"ok": False, "error": f"Tidak dapat menghubungi Langflow: {e.reason}"}
    except TimeoutError:
        return {"ok": False, "error": "Langflow tidak merespons dalam 120 detik."}

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"ok": False, "error": "Respons Langflow bukan JSON valid."}

    # Langflow Run API v1: outputs[0].outputs[0].results.message.text
    text = _extract_text(data)
    if text is None:
        return {"ok": False, "error": "Output Langflow tidak ditemukan.", "raw": data}
    return {"ok": True, "text": text}


def _extract_text(data: dict) -> Optional[str]:
    """Ambil teks dari berbagai struktur respons Langflow."""
    # Struktur utama: outputs[0].outputs[0].results.message.text
    try:
        return data["outputs"][0]["outputs"][0]["results"]["message"]["text"]
    except (KeyError, IndexError, TypeError):
        pass
    # Fallback: outputs[0].outputs[0].messages[0].message
    try:
        return data["outputs"][0]["outputs"][0]["messages"][0]["message"]
    except (KeyError, IndexError, TypeError):
        pass
    # Fallback kedua: output_value langsung
    try:
        return data["outputs"][0]["outputs"][0]["results"]["message"]["data"]["text"]
    except (KeyError, IndexError, TypeError):
        pass
    return None


# Satu flow aktif (project Bidmaster_Proposal): revisi/PRD/draft semua
# lewat flow RAG yang sama — prompts PA menyediakan konteks tugasnya.
def generate_draft(message: str, session_id: str = "") -> dict:
    """Panggil flow proposal aktif (draft)."""
    return _run(flow_id(), message, session_id)


def revise_proposal(message: str, session_id: str = "") -> dict:
    """Revisi via flow proposal aktif."""
    return _run(flow_id(), message, session_id)


def generate_prd(message: str, session_id: str = "") -> dict:
    """PRD via flow proposal aktif."""
    return _run(flow_id(), message, session_id)
