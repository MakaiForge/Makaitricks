#!/usr/bin/env bash
set -euo pipefail

PYTHON_VERSION="3.10.15"
BUILD_TAG="20241016"
BASE_URL="https://github.com/indygreg/python-build-standalone/releases/download/${BUILD_TAG}"
DEPS=("aiohttp" "ijson")

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/out"
WORK_DIR="$(mktemp -d)"

usage() {
  echo "Usage: $0 -p <linux|darwin> -a <x86_64|aarch64> [--install-only]"
  echo ""
  echo "  --install-only   Download + install deps but skip final zip"
  exit 1
}

cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

PLATFORM=""; ARCH=""; INSTALL_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p) PLATFORM="$2"; shift 2 ;;
    -a) ARCH="$2"; shift 2 ;;
    --install-only) INSTALL_ONLY=true; shift ;;
    *) usage ;;
  esac
done

if [[ -z "$PLATFORM" || -z "$ARCH" ]]; then
  case "$(uname -s)" in
    Linux)  PLATFORM="linux" ;;
    Darwin) PLATFORM="darwin" ;;
    *)      echo "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
    *)      echo "Unsupported arch: $(uname -m)"; exit 1 ;;
  esac
fi

case "$PLATFORM-$ARCH" in
  linux-x86_64)  TARGET="x86_64-unknown-linux-gnu"  ;;
  darwin-x86_64) TARGET="x86_64-apple-darwin"        ;;
  darwin-aarch64) TARGET="aarch64-apple-darwin"       ;;
  *) echo "Unsupported combo: $PLATFORM-$ARCH"; exit 1 ;;
esac

OUT_NAME="venv-${PLATFORM}-${ARCH}"
TAR_NAME="cpython-${PYTHON_VERSION}+${BUILD_TAG}-${TARGET}-install_only_stripped.tar.gz"
TAR_URL="${BASE_URL}/${TAR_NAME}"

# Detect if we're cross-building (macOS tarball on Linux host)
HOST_PLATFORM="$(uname -s)"
IS_CROSS=false
if [[ "$PLATFORM" == "darwin" && "$HOST_PLATFORM" == "Linux" ]]; then IS_CROSS=true; fi

echo "═══ Building $OUT_NAME ═══"
echo "  Python:  $PYTHON_VERSION"
echo "  Target:  $TARGET"
echo "  Cross:   $IS_CROSS"
echo "  URL:     $TAR_URL"

# ─── download ──────────────────────────────────────────────────────────────
echo "▸ Downloading python-build-standalone..."
curl -L -f -o "${WORK_DIR}/python.tar.gz" "$TAR_URL"

echo "▸ Extracting..."
mkdir -p "${WORK_DIR}/python"
tar xzf "${WORK_DIR}/python.tar.gz" -C "${WORK_DIR}/python"

PYTHON_DIR="${WORK_DIR}/python/python"
if [[ ! -d "$PYTHON_DIR" ]]; then
  PYTHON_DIR="${WORK_DIR}/python"
fi
if [[ ! -d "${PYTHON_DIR}/bin" ]]; then
  echo "ERROR: bin/ not found after extraction"
  ls "${WORK_DIR}/python/" | head -20
  exit 1
fi

PYTHON_BIN="${PYTHON_DIR}/bin/python3"
BIN_DIR="${PYTHON_DIR}/bin"

# ─── install deps ──────────────────────────────────────────────────────────
echo "▸ Installing pip packages: ${DEPS[*]}..."

if [[ "$IS_CROSS" == "true" ]]; then
  # Cross-build: macOS tarball on Linux.
  # Can't run the macOS Python binary. We use the HOST Python to download
  # macOS-specific wheels, then inject them manually into site-packages.
  echo "   (cross-build mode)"

  SITE_PACKAGES="${PYTHON_DIR}/lib/python3.10/site-packages"
  mkdir -p "$SITE_PACKAGES"

  # Determine macOS wheel platform tag
  WHL_PLATFORM="macosx_10_9_x86_64"
  [[ "$ARCH" == "aarch64" ]] && WHL_PLATFORM="macosx_11_0_arm64"

  HOST_PY=$(command -v python3 || echo "")
  if [[ -z "$HOST_PY" ]]; then
    echo "ERROR: need python3 on host to download macOS wheels"
    exit 1
  fi

  echo "   Using host $HOST_PY to download wheels (platform=$WHL_PLATFORM)..."
  "$HOST_PY" -m pip download \
    --only-binary=:all: \
    --platform "$WHL_PLATFORM" \
    --python-version 3.10 \
    --implementation cp \
    --abi cp310 \
    --dest "${WORK_DIR}/wheels" \
    "${DEPS[@]}" 2>&1

  echo "   Injecting wheels into ${SITE_PACKAGES}..."
  for whl in "${WORK_DIR}/wheels"/*.whl; do
    echo "     + $(basename "$whl")"
    unzip -qo "$whl" -d "$SITE_PACKAGES"
  done

  # Remove .whl metadata dirs from dist-info that may have been extracted
  # (pip/packaging need them, so we keep them)

else
  # Native build — just pip install
  "$PYTHON_BIN" -m pip install --no-compile "${DEPS[@]}" 2>&1 | tail -3

  echo "▸ Verifying imports..."
  "$PYTHON_BIN" -c \
    "import aiohttp; import ijson; print('OK: aiohttp', aiohttp.__version__, 'ijson', ijson.__version__)"
fi

# ─── create wrapper scripts ────────────────────────────────────────────────
echo "▸ Creating wrapper scripts..."

# rename original binary
mv "${BIN_DIR}/python3" "${BIN_DIR}/python3.bin"
mv "${BIN_DIR}/python3.10" "${BIN_DIR}/python3.10.bin" 2>/dev/null || true

cat > "${BIN_DIR}/python3" << 'WRAPPER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
VENV_DIR="$(dirname "$SCRIPT_DIR")"
export PYTHONHOME="$VENV_DIR"
exec "$SCRIPT_DIR/python3.bin" "$@"
WRAPPER
chmod +x "${BIN_DIR}/python3"

cat > "${BIN_DIR}/python3.10" << 'WRAPPER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
VENV_DIR="$(dirname "$SCRIPT_DIR")"
export PYTHONHOME="$VENV_DIR"
exec "$SCRIPT_DIR/python3.10.bin" "$@"
WRAPPER
chmod +x "${BIN_DIR}/python3.10"

ln -sf python3 "${BIN_DIR}/python"
ln -sf pip3 "${BIN_DIR}/pip" 2>/dev/null || true
ln -sf pip3.10 "${BIN_DIR}/pip" 2>/dev/null || true

# verify if native
if [[ "$IS_CROSS" != "true" ]]; then
  echo "▸ Testing wrapper..."
  "${BIN_DIR}/python3" -c \
    "import sys; print('sys.prefix:', sys.prefix); import aiohttp; print('aiohttp OK')"
fi

# ─── finalise ──────────────────────────────────────────────────────────────
if [[ "$INSTALL_ONLY" == "true" ]]; then
  echo ""
  echo "═══ Install only — final dir at: ${PYTHON_DIR} ═══"
  exit 0
fi

mkdir -p "$OUT_DIR"
OUT_FILE="${OUT_DIR}/${OUT_NAME}.tar.gz"

echo "▸ Creating ${OUT_FILE}..."
cd "$PYTHON_DIR"
tar czf "$OUT_FILE" --owner=0 --group=0 .

echo ""
echo "═══ DONE: ${OUT_FILE} ═══"
ls -lh "$OUT_FILE"
