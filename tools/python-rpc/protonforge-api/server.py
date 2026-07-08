#!/usr/bin/env python3
"""
ProtonForge API Server — JSON-RPC sobre stdin/stdout.

Servidor RPC que se comunica com o Electron via stdin/stdout
usando JSON-RPC linha-a-linha (Line Delimited JSON).

Mesmo padrão do python_rpc/main.py.

Protocolo:
    Request:  {"id": 1, "method": "method_name", "params": {...}}
    Response: {"id": 1, "result": {...}}
    Error:    {"id": 1, "error": {"code": "...", "message": "..."}}
    Event:    {"event": "ready", "protocolVersion": 1}

Uso:
    # Modo servidor (usado pelo Electron)
    python server.py

    # Modo comando único (útil pra testes)
    echo '{"id":1,"method":"recommend_proton","params":{"game_id":"1245620"}}' | python server.py

Métodos disponíveis:
    recommend_proton    → Recomenda Proton pra um jogo
    get_game_info       → Info do jogo do catálogo
    search_games        → Busca jogos por nome
    create_prefix       → Cria/configura prefixo Wine
    get_recommended_dlls → DLLs recomendadas pro jogo
    get_launch_command  → Monta comando de lançamento
    get_installed_protons → Lista Protons instalados
    list_available_forks → Lista forks disponíveis
"""

import json
import os
import sys
import time
import traceback
import threading
from datetime import datetime

from api.handler import dispatch, RpcError
from api import audit

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "log.txt")


def log_msg(*args):
    """Appends a timestamped line to log.txt in the same directory as this script."""
    ts = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    line = f"[{ts}] {' '.join(str(a) for a in args)}"
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def write_response(payload: dict):
    """Escreve uma resposta JSON no stdout.

    Args:
        payload: Dict a ser serializado como JSON

    Nota: Usa separators compactos pra minimizar tamanho.
    Cada resposta é uma linha JSON terminada em \n.
    """
    serialized = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))
    sys.stdout.write(serialized + "\n")
    sys.stdout.flush()


def handle_request(request_payload: dict):
    """Processa uma requisição RPC com audit logging completo.

    Args:
        request_payload: Dict com id, method, params

    Formato esperado:
        {
            "id": <int|str>,
            "method": "<method_name>",
            "params": {<key>: <value>}  // opcional
        }
    """
    request_id = request_payload.get("id")
    method = request_payload.get("method")
    params = request_payload.get("params")
    _start = time.monotonic()

    if request_id is None:
        audit.request(None, method or "unknown", params)
        write_response({
            "id": None,
            "error": {"code": "invalid_request", "message": "Missing request id"},
        })
        return

    if not isinstance(method, str) or not method:
        audit.request(request_id, "invalid", params)
        write_response({
            "id": request_id,
            "error": {"code": "invalid_method", "message": "Invalid method"},
        })
        return

    audit.request(request_id, method, params)

    try:
        result = dispatch(method, params)
        duration = (time.monotonic() - _start) * 1000
        audit.response(request_id, method, result, duration)
        write_response({"id": request_id, "result": result})
        log_msg("OK", method, str(request_id))
    except RpcError as e:
        duration = (time.monotonic() - _start) * 1000
        audit.error(request_id, method, e.code, e.message, duration)
        log_msg("RPC_ERROR", method, str(request_id), e.code, e.message)
        write_response({
            "id": request_id,
            "error": {"code": e.code, "message": e.message},
        })
    except Exception as e:
        duration = (time.monotonic() - _start) * 1000
        audit.exception(request_id, method, e, duration)
        log_msg("EXCEPTION", method, str(request_id), str(e)[:200])
        traceback.print_exc(file=sys.stderr)
        write_response({
            "id": request_id,
            "error": {"code": "internal_error", "message": str(e)[:200]},
        })


def start_stdio_rpc_loop():
    """Loop principal de leitura de stdin e resposta no stdout.

    Cada linha do stdin é uma requisição JSON.
    Cada resposta é uma linha no stdout.
    Requisições são processadas em threads separadas pra não travar
    o loop de leitura durante operações longas (como winetricks).

    Evento de ready é enviado assim que o servidor inicia.
    """
    log_msg("API", "started", "--stdio")
    write_response({"event": "ready", "protocolVersion": 1})

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        try:
            payload = json.loads(line)
        except json.JSONDecodeError as e:
            write_response({
                "id": None,
                "error": {"code": "invalid_json", "message": f"Invalid JSON: {e}"},
            })
            continue

        if not isinstance(payload, dict):
            write_response({
                "id": None,
                "error": {"code": "invalid_request", "message": "Request must be an object"},
            })
            continue

        # Thread separada pra não bloquear o loop de stdin
        thread = threading.Thread(target=handle_request, args=(payload,), daemon=True)
        thread.start()


# ─── Modo comando único ──────────────────────────────────────────
# Se o primeiro argumento for um JSON válido, processa essa única
# requisição e sai. Útil pra testes e debug.

def main():
    """Entry point.

    Comportamento:
    - Se `--stdio` passado, entra em modo loop persistente (usado pelo Electron)
    - Se stdin tem dados (pipe), lê uma linha e processa (modo comando único)
    - Se stdin é terminal, entra em modo loop
    """
    if "--stdio" in sys.argv:
        start_stdio_rpc_loop()
        return

    if not sys.stdin.isatty():
        # Modo pipe: lê uma linha, processa, sai
        raw_line = sys.stdin.readline().strip()
        if raw_line:
            log_msg("API", "single-shot")
            try:
                payload = json.loads(raw_line)
                handle_request(payload)
            except json.JSONDecodeError as e:
                log_msg("JSON_ERROR", str(e))
                write_response({
                    "id": None,
                    "error": {"code": "invalid_json", "message": str(e)},
                })
        return

    # Modo interativo (loop contínuo)
    log_msg("API", "started", "interactive")
    start_stdio_rpc_loop()


if __name__ == "__main__":
    main()
