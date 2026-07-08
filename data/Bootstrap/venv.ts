import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { app } from "electron";
import { logger } from "@main/services/logger";
import { WindowManager } from "@main/services/window-manager";

const VENV_TAR = "venv.tar.gz";
const VENV_TAG = "v1.0.0";
const VENV_MIRRORS = [
  `https://github.com/MakaiForge/venv/releases/download/${VENV_TAG}/${VENV_TAR}`,
  `https://gitlab.com/api/v4/projects/83079801/packages/generic/venv/1.0.0/${VENV_TAR}`,
];

export function getVenvDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "venv")
    : path.join(app.getAppPath(), "tools", "venv");
}

export function getVenvPython(): string {
  return path.join(getVenvDir(), "bin", "python3");
}

function getVenvTarPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, VENV_TAR);
  }
  return path.join(app.getAppPath(), "tools", "venv", VENV_TAR);
}

function sendProgress(status: string, percent: number) {
  const target = WindowManager.setupWindow || WindowManager.mainWindow;
  target?.webContents.send("on-venv-progress", { status, percent });
}

export function checkVenv(): boolean {
  const pythonPath = getVenvPython();
  if (!fs.existsSync(pythonPath)) return false;
  const result = cp.spawnSync(pythonPath, ["--version"], {
    stdio: "ignore",
    timeout: 5000,
  });
  return result.status === 0 && !result.error;
}
function downloadVenv(tarPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sendProgress("downloading", 5);
    fs.mkdirSync(path.dirname(tarPath), { recursive: true });

    let lastErr: Error | null = null;
    let idx = 0;

    function tryNext() {
      if (idx >= VENV_MIRRORS.length) {
        return reject(lastErr || new Error("All mirrors failed"));
      }

      const url = VENV_MIRRORS[idx++];
      logger.info(`[venv] Downloading from ${url}`);

      const child = cp.spawn("curl", ["-L", "-f", "-o", tarPath, url], {
        stdio: "pipe", timeout: 120000,
      });

      child.on("exit", (code) => {
        if (code === 0) {
          sendProgress("downloaded", 90);
          resolve();
        } else {
          try { fs.rmSync(tarPath); } catch {}
          lastErr = new Error(`curl exit code ${code} for ${url}`);
          tryNext();
        }
      });

      child.on("error", (err) => {
        try { fs.rmSync(tarPath); } catch {}
        lastErr = err;
        tryNext();
      });
    }

    tryNext();
  });
}

export async function restoreVenv(): Promise<boolean> {
  const tarPath = getVenvTarPath();
  const venvDir = getVenvDir();

  if (!fs.existsSync(tarPath)) {
    logger.warn(`[venv] ${VENV_TAR} not found locally, downloading...`);
    try {
      await downloadVenv(tarPath);
    } catch (err) {
      logger.error(`[venv] Download failed: ${err}`);
      sendProgress("error", 0);
      return false;
    }
  }

  sendProgress("restoring", 10);
  logger.info(`[venv] Restoring from ${tarPath}`);

  return new Promise((resolve) => {
    fs.mkdirSync(venvDir, { recursive: true });

    const child = cp.spawn("tar", ["-xzf", tarPath, "--strip-components=1", "-C", venvDir], {
      stdio: "pipe",
      timeout: 30000,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        sendProgress("verifying", 80);
        const ok = checkVenv();
        if (ok) {
          logger.info("[venv] Restored successfully");
          sendProgress("ready", 100);
          resolve(true);
        } else {
          logger.error("[venv] Restore completed but venv is still broken");
          sendProgress("error", 0);
          resolve(false);
        }
      } else {
        logger.error(`[venv] tar exit code ${code}`);
        sendProgress("error", 0);
        resolve(false);
      }
    });

    child.on("error", (err) => {
      logger.error(`[venv] tar spawn error: ${err.message}`);
      sendProgress("error", 0);
      resolve(false);
    });
  });
}

export async function ensureVenv(): Promise<boolean> {
  sendProgress("checking", 0);
  if (checkVenv()) {
    sendProgress("ready", 100);
    return true;
  }

  logger.warn("[venv] Corrupted or missing, restoring...");
  return restoreVenv();
}
