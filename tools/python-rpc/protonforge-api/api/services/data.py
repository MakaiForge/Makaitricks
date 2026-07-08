"""
Carregamento e cache de arquivos JSON da API.

Gerencia o cache global pra evitar recarregar arquivos grandes
(protons.json, anticheat.json, gacha_navegador_chromium.json, etc).
"""

import json
import os

_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
_PROTON_API_DIR = os.path.join(
    os.path.dirname(_PROJECT_ROOT),
    "plania proton aqui", "api proton"
)

_cache: dict = {}


def _load_json(filename: str) -> dict | list:
    if filename in _cache:
        return _cache[filename]
    filepath = os.path.join(_PROTON_API_DIR, filename)
    if not os.path.exists(filepath):
        _cache[filename] = {}
        return {}
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    _cache[filename] = data
    return data
