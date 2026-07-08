"""
Conexões SQLite para o catálogo de jogos e dados de Proton.

Gerencia duas bases:
- catalogo.db (252MB): metadados dos jogos (título, gênero, etc) + FTS
- proton_data.db (280MB): game_matches + fork_recommendations
"""

import os
import sqlite3

_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
_CATALOGO_DB = os.path.join(_PROJECT_ROOT, "resources", "catalogo.db")
_PROTON_DATA_DB = os.path.join(_PROJECT_ROOT, "resources", "proton_data.db")

_cache: dict = {}


def _get_db() -> sqlite3.Connection:
    if "db" not in _cache:
        conn = sqlite3.connect(_CATALOGO_DB, timeout=5)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.row_factory = sqlite3.Row
        _cache["db"] = conn
    return _cache["db"]


def _get_proton_db() -> sqlite3.Connection | None:
    if "proton_db" in _cache:
        return _cache["proton_db"]
    if not os.path.exists(_PROTON_DATA_DB):
        return None
    conn = sqlite3.connect(_PROTON_DATA_DB, timeout=5, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    _cache["proton_db"] = conn
    return conn
