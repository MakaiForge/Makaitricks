"""
Audit/activity logger for ProtonForge API.
Writes structured JSON-line logs to activity.log at the API root.
Each line = one event: request received, service called, result returned, error.

Format: NDJSON (one JSON object per line), all UTF-8.
"""

import json
import os
import time
import traceback
from datetime import datetime, timezone
from typing import Any

ACTIVITY_LOG = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "activity.log",
)


def _ensure_log_file():
    try:
        os.makedirs(os.path.dirname(ACTIVITY_LOG), exist_ok=True)
    except Exception:
        pass


def _write(entry: dict):
    _ensure_log_file()
    try:
        with open(ACTIVITY_LOG, "a") as f:
            f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")
    except Exception:
        pass


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def request(id: Any, method: str, params: dict | None):
    _write({
        "type": "request",
        "ts": _ts(),
        "id": id,
        "method": method,
        "params": params,
    })


def response(id: Any, method: str, result: Any, duration_ms: float):
    _write({
        "type": "response",
        "ts": _ts(),
        "id": id,
        "method": method,
        "result": result if isinstance(result, (dict, list, str, int, float, bool, type(None))) else str(result),
        "duration_ms": round(duration_ms, 2),
        "status": "success",
    })


def error(id: Any, method: str, code: str, message: str, duration_ms: float):
    _write({
        "type": "error",
        "ts": _ts(),
        "id": id,
        "method": method,
        "error_code": code,
        "error_message": message,
        "duration_ms": round(duration_ms, 2),
        "status": "error",
    })


def exception(id: Any, method: str, exc: Exception, duration_ms: float):
    _write({
        "type": "exception",
        "ts": _ts(),
        "id": id,
        "method": method,
        "error_message": str(exc)[:500],
        "traceback": traceback.format_exc()[-2000:],
        "duration_ms": round(duration_ms, 2),
        "status": "error",
    })


def event(event_type: str, data: dict | None = None):
    _write({
        "type": "event",
        "ts": _ts(),
        "event": event_type,
        "data": data,
    })


def service_call(service: str, method: str, params: dict, result: Any, duration_ms: float, status: str = "success"):
    _write({
        "type": "service_call",
        "ts": _ts(),
        "service": service,
        "method": method,
        "params": params,
        "result": str(result)[:500],
        "duration_ms": round(duration_ms, 2),
        "status": status,
    })
