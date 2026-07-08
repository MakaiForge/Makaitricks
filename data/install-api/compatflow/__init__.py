"""
CompatFlow - Verificador de Compatibilidade Windows → Linux

Módulo modularizado do CompatFlow para integração com ProtonForge.

Funcionalidades:
  - Analisa arquivos .exe/.msi e identifica o aplicativo/jogo
  - Verifica se existe versão nativa Linux disponível
  - Verifica se existe port via Lutris
  - Interface gráfica PySide6
  - Integração com ProtonForge via RPC
"""

__version__ = "1.0.0"
__author__ = "lucasgertke11-bot"

from .core.analyzer import analyze, get_app_name, check_native, check_port
from .core.database import NATIVE, load_ports
