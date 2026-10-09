"""Langflow HTTP client untuk BidMaster.

Memanggil Langflow Run API langsung (tanpa MCP) dari web server.
Endpoint: POST {LANGFLOW_URL}/api/v1/run/{flow_endpoint}?stream=false

Variabel env yang diperlukan:
    LANGFLOW_URL     — base URL Langflow, mis. http://127.0.0.1:7860
    LANGFLOW_API_KEY — API key dari Langflow Project

Jika kedua variabel tidak diisi, is_configured() mengembalikan False dan
caller wajib mengembalikan 503 ke browser.
"""
import json
import os
import urllib.error
import urllib.request
from typing import Optional

# Baca dari environment (di-load oleh server.py dari .env)
_URL = os.getenv("LANGFLOW_URL", "").rstrip("/")
_KEY = os.getenv("LANGFLOW_API_KEY", "")

# Timeout dalam detik — Langflow bisa lambat saat cold start
_TIMEOUT = 120

# Nama endpoint flow di Langflow (sesuai endpoint_name di JSON flow)
FLOW_DRAFT = "generate_proposal_draft"
FLOW_REVISE = "revise_proposal"
FLOW_PRD = "generate_prd_from_brief"


def is_configured() -> bool:
    """True jika LANGFLOW_URL dan LANGFLOW_API_KEY sudah diisi."""
    return bool(_URL and _KEY)


def _run(flow_endpoint: str, message: str, session_id: str = "") -> dict:
    """Panggil Langflow Run API dan kembalikan dict hasil.

    Mengembalikan:
        {"ok": True, "text": "<output teks>"}
    atau
        {"ok": False, "error": "<pesan error>"}
    """
    url = f"{_URL}/api/v1/run/{flow_endpoint}?stream=false"
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
            "x-api-key": _KEY,
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


def generate_draft(message: str, session_id: str = "") -> dict:
    """Panggil flow generate_proposal_draft."""
    return _run(FLOW_DRAFT, message, session_id)


def revise_proposal(message: str, session_id: str = "") -> dict:
    """Panggil flow revise_proposal."""
    return _run(FLOW_REVISE, message, session_id)


def generate_prd(message: str, session_id: str = "") -> dict:
    """Panggil flow generate_prd_from_brief."""
    return _run(FLOW_PRD, message, session_id)
