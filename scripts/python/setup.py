import os
import sys
import shutil

from cx_Freeze import Executable, setup

shutil.copy("python_rpc/qbittorrent_client.py", "python_rpc_qb.py")

build_exe_options = {
    "packages": [],
    "build_exe": "protonforge-python-rpc-new",
    "include_msvcr": True,
    "excludes": ["tkinter"],
}

setup(
    name="protonforge-python-rpc",
    version="0.1",
    description="ProtonForge",
    options={"build_exe": build_exe_options},
    executables=[
        Executable(
            "python_rpc/main.py",
            target_name="protonforge-python-rpc",
        )
    ],
)