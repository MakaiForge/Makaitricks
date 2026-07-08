#!/bin/bash
# Restaura o projeto para o backup inicial (commit atual do git)
# Uso: bash restore.sh

set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

echo "=== Restaurando ProtonForge para o backup salvo ==="

if [ -d .git ]; then
  echo "git encontrado. Restaurando todos os arquivos para o último commit..."
  git restore .
  git clean -fd
  echo "OK - Projeto restaurado para o commit: $(git log --oneline -1)"
else
  echo "ERRO: .git não encontrado. O backup git foi perdido."
  exit 1
fi
