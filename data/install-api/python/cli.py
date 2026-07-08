#!/usr/bin/env python3
"""
CLI do CompatFlow - Ponto de entrada para execucao standalone.

Uso:
    python compatflow/cli.py <caminho_do_exe>
    python compatflow/cli.py --test <caminho_do_exe>
    python compatflow/cli.py --update
    python compatflow/cli.py --list
"""

import sys
import json
import os

# Adiciona a raiz do projeto ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compatflow.core.analyzer import analyze
from compatflow.core.database import NATIVE, GAME_NAMES, load_ports


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == "--test":
        if len(sys.argv) < 3:
            print("Uso: compatflow --test <caminho_do_exe>")
            sys.exit(1)
        result = analyze(sys.argv[2])
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif command == "--update":
        from compatflow.utils.network import update_cache
        update_cache()

    elif command == "--list":
        print("=== Apps Nativos ({}) ===".format(len(NATIVE)))
        for keyword, (app, pkg, desc) in sorted(NATIVE.items()):
            print(f"  {app:30s} pacote: {pkg}")
        print("\n=== Jogos Conhecidos ({}) ===".format(len(GAME_NAMES)))
        seen = set()
        for game in sorted(set(GAME_NAMES.values())):
            if game not in seen:
                print(f"  {game}")
                seen.add(game)
        print("\n=== Ports (Lutris) ===")
        ports = load_ports()
        for pid, port in ports.items():
            print(f"  {port.get('name', pid):30s} type: {port.get('type', '?')}")

    elif sys.argv[1].startswith("--"):
        print(f"Comando desconhecido: {command}")
        sys.exit(1)

    else:
        # Analisa o arquivo passado como argumento
        result = analyze(sys.argv[1])
        print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
