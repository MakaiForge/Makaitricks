"""
Core — montagem do comando de lançamento.

build_launch_command() → monta env vars + comando proton run
list_available_args()  → catálogo completo do launch_args.json
get_game_specific_tips() → dicas específicas por jogo
"""

import json
import os
import shlex

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_PROTON_API_DIR = os.path.join(
    os.path.dirname(_PROJECT_ROOT), "plania proton aqui", "api proton"
)

_cache = {}


def _load_launch_args() -> dict:
    if "launch_args" in _cache:
        return _cache["launch_args"]
    filepath = os.path.join(_PROTON_API_DIR, "launch_args.json")
    if not os.path.exists(filepath):
        return {"args": {}}
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    _cache["launch_args"] = data
    return data


def build_launch_command(
    game_id: str,
    prefix_path: str,
    proton_path: str,
    executable: str,
    launch_options: str | None = None,
    env_overrides: dict | None = None,
) -> dict:
    env_vars = {}
    env_vars["WINEPREFIX"] = prefix_path
    env_vars["PROTONPATH"] = proton_path
    env_vars["STEAM_COMPAT_DATA_PATH"] = prefix_path

    if launch_options:
        parsed = _parse_launch_options_string(launch_options)
        env_vars.update(parsed)

    if env_overrides:
        env_vars.update(env_overrides)

    env_vars_formatted = [f"{k}={v}" for k, v in sorted(env_vars.items())]

    proton_bin = os.path.join(proton_path, "proton")
    command = proton_bin
    args = ["run", executable]

    env_str = " ".join(env_vars_formatted)
    shell_command = f"{env_str} {shlex.quote(command)} {' '.join(shlex.quote(a) for a in args)}"

    return {
        "env_vars": env_vars,
        "env_vars_formatted": env_vars_formatted,
        "command": command,
        "args": args,
        "full_command": {
            "base": command,
            "args": args,
            "env": env_vars,
        },
        "shell_command": shell_command,
    }


def _parse_launch_options_string(options_str: str) -> dict:
    result = {}
    text = options_str.replace("%command%", "").strip()
    parts = text.split()
    for part in parts:
        if "=" in part and not part.startswith("$"):
            key, value = part.split("=", 1)
            key = key.strip()
            value = value.strip().strip("\"'")
            if key and value:
                result[key] = value
    return result


def list_available_args(fork_id: str | None = None) -> list[dict]:
    args_data = _load_launch_args()
    args = args_data.get("args", {})
    category_map = args_data.get("categories", {})

    result = []
    for arg_id, arg_info in args.items():
        if arg_id.startswith("===="):
            continue

        category = arg_info.get("category", "other")
        fork_support = arg_info.get("forkSupport", [])

        if fork_id and fork_id not in fork_support:
            continue

        result.append({
            "id": arg_id,
            "category": category,
            "category_name": category_map.get(category, {}).get("description", category),
            "descricao": arg_info.get("description", ""),
            "uso": arg_info.get("usage", ""),
            "fork_support": fork_support,
            "source": arg_info.get("source", ""),
        })

    return sorted(result, key=lambda x: (x["category"], x["id"]))


def get_game_specific_tips(game_id: str) -> list[dict]:
    args_data = _load_launch_args()
    args = args_data.get("args", {})
    tips = args_data.get("gameSpecificTips", {}).get("tips", [])

    for tip in tips:
        if str(tip.get("id")) == str(game_id):
            return tip.get("launchTips", [])

    return []
