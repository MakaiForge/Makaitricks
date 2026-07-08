#!/bin/bash
# ProtonForge Launcher

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Se estiver rodando como root, executa como o usuário original
if [ "$(id -u)" -eq 0 ]; then
  TARGET_USER="${SUDO_USER:-${LOGNAME:-$(logname 2>/dev/null || echo "")}}"
  if [ -z "$TARGET_USER" ]; then
    TARGET_USER=$(ls -ld "$APP_DIR" 2>/dev/null | awk '{print $3}')
  fi
  if [ -z "$TARGET_USER" ]; then
    echo "Não foi possível detectar o usuário original. Execute como usuário normal."
    exit 1
  fi
  TARGET_UID=$(id -u "$TARGET_USER" 2>/dev/null || echo "")
  export DISPLAY="${DISPLAY:-:0}"
  export XAUTHORITY="${XAUTHORITY:-$(eval echo ~$TARGET_USER)/.Xauthority}"
  if [ -n "$TARGET_UID" ]; then
    export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$TARGET_UID/bus}"
  fi
  exec su -s /bin/bash -c "cd '$APP_DIR' && exec bash '$0'" "$TARGET_USER"
  exit 0
fi

cd "$APP_DIR"

# Detecta display automaticamente
if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  if [ -n "${XDG_SESSION_TYPE:-}" ]; then
    if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
      export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
    fi
  fi

  # Tenta obter o display da sessão ativa
  if [ -z "${DISPLAY:-}" ]; then
    for sess in /tmp/.X*-lock; do
      dpy=$(basename "$sess" | sed 's/\.X\([0-9]*\)-lock/:\1/')
      if [ -n "$dpy" ]; then
        export DISPLAY="$dpy"
        break
      fi
    done
  fi

  # Fallback para :0
  export DISPLAY="${DISPLAY:-:0}"

  # Tenta configurar X authority
  if [ -z "${XAUTHORITY:-}" ] || [ ! -f "$XAUTHORITY" ]; then
    XAUTH_FILE=$(ps aux | grep -oP '(?<=-auth\s)[^\s]+' | head -1)
    if [ -n "$XAUTH_FILE" ] && [ -f "$XAUTH_FILE" ]; then
      export XAUTHORITY="$XAUTH_FILE"
    elif [ -f "$HOME/.Xauthority" ]; then
      export XAUTHORITY="$HOME/.Xauthority"
    fi
  fi
fi

ELECTRON_FLAGS="--no-sandbox --disable-gpu"

echo "=== ProtonForge ==="
echo "1 - Iniciar (sem compilar)"
echo "2 - Verificar + compilar + iniciar"
echo "3 - Setup completo (reinstalar + restaurar interface)"
echo "4 - Verificar consistência (bild.cjs check)"
echo "5 - Apenas compilar (bild.cjs build)"
echo ""
read -p "Escolha uma opção: " opt

case "$opt" in
  1)
    echo "Iniciando ProtonForge..."
    node ./node_modules/electron/cli.js . $ELECTRON_FLAGS 2>&1 | grep -v 'Autofill\|mojo\|XGetWindowAttributes\|xdg-mime'
    ;;
  2)
    echo "=== Verificando consistência ==="
    node scripts/bild.cjs check || true
    echo ""
    echo "Compilando ProtonForge..."
    npm run build 2>&1 || { echo "Falha na compilação"; exit 1; }
    echo "Iniciando ProtonForge..."
    node ./node_modules/electron/cli.js . $ELECTRON_FLAGS 2>&1 | grep -v 'Autofill\|mojo\|XGetWindowAttributes\|xdg-mime'
    ;;
  3)
    exec bash scripts/setup.sh
    ;;
  4)
    exec node scripts/bild.cjs check
    ;;
  5)
    exec node scripts/bild.cjs build
    ;;
  *)
    echo "Opção inválida"
    exit 1
    ;;
esac
