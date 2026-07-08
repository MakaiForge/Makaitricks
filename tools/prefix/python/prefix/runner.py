"""
Proton/Umu command runner — run arbitrary commands inside a game's prefix.

Unified from:
  - data/install-api/proton_recommended/python/Utils/prefix/runner.py
"""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional


def run_proton_command_for_game(
    proton_path: str,
    command: list[str],
    use_umu: bool = False,
    env_override: Optional[dict[str, str]] = None,
) -> Optional[int]:
    """
    Run a command inside a game's Proton context.

    Builds environment from os.environ + env_override.
    Sets defaults for STEAM_COMPAT_* vars only if not already provided.
    Uses umu-run if available and requested.
    """
    run_env = os.environ.copy()
    if env_override:
        run_env.update(env_override)

    proton = Path(proton_path)

    # Only set defaults if caller didn't provide them in env_override
    run_env.setdefault("STEAM_COMPAT_DATA_PATH", "")
    run_env.setdefault("STEAM_COMPAT_CLIENT_INSTALL_PATH", str(proton.parent))

    if use_umu:
        umu = shutil.which("umu-run")
        if umu:
            cmd = [umu] + command
        else:
            cmd = [str(proton), "run"] + command
    else:
        cmd = [str(proton), "run"] + command

    try:
        result = subprocess.run(cmd, env=run_env, capture_output=False, timeout=3600)
        return result.returncode
    except (subprocess.TimeoutExpired, OSError):
        return None
