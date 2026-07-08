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
import sys
import traceback
import threading

from api.handler import dispatch, RpcError


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
    """Processa uma requisição RPC.

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

    if request_id is None:
        write_response({
            "id": None,
            "error": {"code": "invalid_request", "message": "Missing request id"},
        })
        return

    if not isinstance(method, str) or not method:
        write_response({
            "id": request_id,
            "error": {"code": "invalid_method", "message": "Invalid method"},
        })
        return

    try:
        result = dispatch(method, params)
        write_response({"id": request_id, "result": result})
    except RpcError as e:
        write_response({
            "id": request_id,
            "error": {"code": e.code, "message": e.message},
        })
    except Exception as e:
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
            try:
                payload = json.loads(raw_line)
                handle_request(payload)
            except json.JSONDecodeError as e:
                write_response({
                    "id": None,
                    "error": {"code": "invalid_json", "message": str(e)},
                })
        return

    # Modo interativo (loop contínuo)
    start_stdio_rpc_loop()


if __name__ == "__main__":
    main()
