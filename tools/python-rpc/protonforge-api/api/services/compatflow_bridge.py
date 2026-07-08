"""
Ponte de integracao CompatFlow -> ProtonForge.

Adapta a logica de analise do CompatFlow para ser usada como
servico RPC na API do ProtonForge. Quando um .exe e analisado,
o resultado alimenta o fluxo de recomendacao de Proton.
"""

import os
import sys

# Adiciona data/install-api/ ao path para importar compatflow
_COMPATFLOW_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), *([".."] * 5), "data", "install-api")
)
if _COMPATFLOW_DIR not in sys.path:
    sys.path.insert(0, _COMPATFLOW_DIR)

from compatflow.core.analyzer import analyze as compatflow_analyze
from compatflow.core.database import (
    check_native,
    check_port,
    get_game_name,
    get_app_name,
    NATIVE,
    GAME_NAMES,
)


def analyze_exe(exe_path: str) -> dict:

    """
    Analisa um arquivo .exe/.msi e retorna informacoes de compatibilidade.

    Integra o CompatFlow com o ProtonForge:
    - Se for app nativo Linux: sugere instalacao nativa
    - Se for jogo conhecido: retorna o nome do jogo para recomendacao de Proton
    - Se for port: sugere instalacao via Lutris
    - Se desconhecido: retorna como unknown

    Args:
        exe_path: Caminho completo para o arquivo .exe ou .msi

    Returns:
        dict com resultado da analise + dados para o fluxo ProtonForge
    """
    if not os.path.exists(exe_path):
        return {
            "success": False,
            "error": f"Arquivo nao encontrado: {exe_path}",
        }

    # Executa a analise do CompatFlow
    result = compatflow_analyze(exe_path)

    # Se for jogo conhecido ("game" ou "unknown" mas com game_name),
    # enriquece com dados uteis para o ProtonForge
    if result.get("game_name") or result["type"] in ("game", "unknown"):
        game_name = result.get("game_name") or result["app"]
        result["protonforge"] = {
            "needs_recommendation": True,
            "game_name": game_name,
            "can_install": True,
        }
    elif result["type"] == "native":
        result["protonforge"] = {
            "needs_recommendation": False,
            "has_native": True,
            "package": result.get("package"),
        }
    elif result["type"] == "port":
        result["protonforge"] = {
            "needs_recommendation": False,
            "has_port": True,
            "port_type": result.get("port", {}).get("type", "lutris"),
        }
    else:
        result["protonforge"] = {
            "needs_recommendation": True,
            "game_name": result["app"],
            "can_install": True,
        }

    result["success"] = True
    return result


def get_native_apps_list() -> list:
    """Retorna a lista completa de apps nativos conhecidos."""
    return sorted(
        [
            {"keyword": k, "name": v[0], "package": v[1], "description": v[2]}
            for k, v in NATIVE.items()
        ],
        key=lambda x: x["name"].lower(),
    )


def get_game_names_list() -> list:
    """Retorna a lista de mapeamentos de nome de jogo."""
    return sorted(
        [
            {"keyword": k, "game": v}
            for k, v in GAME_NAMES.items()
        ],
        key=lambda x: x["game"].lower(),
    )
