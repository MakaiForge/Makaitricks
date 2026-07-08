"""
Utilitários de sistema: detecção de distro, verificação de pacotes.
"""

import os
import subprocess


def get_distro():
    """Detecta a distribuição Linux."""
    if os.path.exists('/etc/arch-release'):
        return "arch"
    elif os.path.exists('/etc/fedora-release'):
        return "fedora"
    elif os.path.exists('/etc/opensuse-release'):
        return "opensuse"
    return "ubuntu"


def get_install_cmd(package):
    """Retorna o comando de instalação para a distro atual."""
    distro = get_distro()
    if distro == "arch":
        return f"sudo pacman -S {package}"
    elif distro == "fedora":
        return f"sudo dnf install {package}"
    elif distro == "opensuse":
        return f"sudo zypper install {package}"
    return f"sudo apt install {package}"


def check_installed(package):
    """Verifica se um pacote está instalado no sistema."""
    distro = get_distro()
    try:
        if distro == "arch":
            cmd = ["pacman", "-Q", package]
        else:
            cmd = ["dpkg", "-s", package]
        r = subprocess.run(cmd, capture_output=True, timeout=5)
        return r.returncode == 0
    except Exception:
        return False


def check_lutris():
    """Verifica se Lutris está instalado."""
    return check_installed("lutris") or os.path.exists("/usr/bin/lutris")


def check_wine():
    """Verifica se Wine está instalado."""
    if os.path.exists("/usr/bin/wine") or os.path.exists("/usr/bin/wine64"):
        return True
    return (
        check_installed("wine")
        or check_installed("winehq-stable")
        or check_installed("wine-stable")
    )
