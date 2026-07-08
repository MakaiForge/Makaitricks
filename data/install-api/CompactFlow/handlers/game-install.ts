import { execFile } from "node:child_process";
import { cfBridgePath } from "../cf-bridge";
import type { IpcMain } from "electron";

export function registerGameInstall(ipcMain: IpcMain) {
  ipcMain.handle("game-install", async (_event, opts: any) => {
    const { gameId, gameTitle, exePath, protonPath } = opts;
    return new Promise((resolve) => {
      execFile("/usr/bin/node", [
        cfBridgePath("install-game/index.js"),
        "--game-id", gameId,
        "--game-title", gameTitle || gameId,
        "--exe", exePath,
        "--proton-path", protonPath,
      ], { timeout: 7200000, maxBuffer: 1024 * 1024 }, (err, stdout) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        try {
          const lines = stdout.trim().split("\n");
          const lastLine = lines[lines.length - 1];
          resolve(JSON.parse(lastLine));
        } catch { resolve({ success: false, error: "Invalid bridge output" }); }
      });
    });
  });
}
