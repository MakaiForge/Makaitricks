import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

/**
 * Resolve the project's venv Python path.
 * Works in both dev and packaged mode.
 */
export function getVenvPythonPath(): string | null {
  const candidates = [
    process.env.PROTONFORGE_PYTHON,
    process.env.HYDRA_UMU_PYTHON,
    app.isPackaged
      ? path.join(process.resourcesPath, "venv", "bin", "python3")
      : path.join(app.getAppPath(), "tools", "venv", "bin", "python3"),
    app.isPackaged
      ? path.join(process.resourcesPath, "venv", "bin", "python")
      : path.join(app.getAppPath(), "tools", "venv", "bin", "python"),
  ].filter((v): v is string => Boolean(v));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Get the tools/prefix/python directory path for PYTHONPATH manipulation.
 */
export function getPrefixPythonDir(): string {
  return path.join(app.getAppPath(), "tools", "prefix", "python");
}
