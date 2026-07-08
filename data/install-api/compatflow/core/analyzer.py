"""
Analisador de executáveis Windows.
Extrai informações do .exe e determina o tipo de compatibilidade.
"""

import os

from .database import (
    get_app_name,
    get_game_name,
    check_native,
    check_port,
)


def analyze(exe_path):
    """
    Analisa um arquivo .exe/.msi e retorna informações de compatibilidade.

    Args:
        exe_path: Caminho completo para o arquivo .exe ou .msi

    Returns:
        dict com:
            - original: nome original do arquivo
            - clean_name: nome limpo (sem extensão, espaços, etc)
            - game_name: nome real do jogo (se identificado), ou None
            - type: "native" | "port" | "game" | "unknown"
            - app: nome do aplicativo/jogo
            - package: pacote Linux (se native)
            - desc: descrição (se native)
            - port: dados do port (se port)
            - port_id: id do port (se port)
    """
    clean_name = get_app_name(exe_path)
    result = {
        "original": os.path.basename(exe_path),
        "clean_name": clean_name,
        "game_name": get_game_name(clean_name),
    }

    # 1. Verifica se é um app nativo Linux
    native = check_native(clean_name)
    if native["found"]:
        result["type"] = "native"
        result["app"] = native["app"]
        result["package"] = native["package"]
        result["desc"] = native["desc"]
        return result

    # 2. Verifica se tem port no Lutris
    port = check_port(clean_name)
    if port["found"]:
        result["type"] = "port"
        result["app"] = port["port"].get("name", clean_name.title())
        result["port"] = port["port"]
        result["port_id"] = port["id"]
        return result

    # 3. Verifica se é um jogo conhecido (pelo nome)
    game_name = get_game_name(clean_name)
    if game_name:
        result["type"] = "game"
        result["app"] = game_name
        return result

    # 4. Desconhecido
    result["type"] = "unknown"
    result["app"] = clean_name.title() if clean_name else "Desconhecido"
    return result


def analyze_batch(exe_paths):
    """Analisa múltiplos arquivos .exe de uma vez."""
    return [analyze(p) for p in exe_paths]
