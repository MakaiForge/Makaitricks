import path from "node:path";
import { execFile } from "node:child_process";
import { cfBridgePath } from "../cf-bridge";
import type { IpcMain } from "electron";

export function registerProtonHandlers(ipcMain: IpcMain) {
  const protonTools = require(path.join(cfBridgePath("proton/index.js")));

  ipcMain.handle("proton-list", async () => {
    return protonTools.listInstalled();
  });

  ipcMain.handle("proton-available", async () => {
    return protonTools.listAvailable();
  });

  ipcMain.handle("proton-install", async (_event, tag: string, url: string) => {
    try {
      const result = protonTools.installProton(tag, url);
      return { success: true, version: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("proton-release-ratings", async (_event, releases: any[]) => {
    try {
      const data = protonTools.rateReleases(releases);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("proton-forks", async () => {
    return new Promise((resolve, reject) => {
      execFile("/usr/bin/node", [cfBridgePath("proton/index.js"), "forks"], {
        timeout: 15000,
        encoding: "utf-8",
      }, (err, stdout) => {
        if (err) { reject(err); return; }
        try { resolve(JSON.parse(stdout.trim())); }
        catch { reject(new Error("Invalid JSON from proton-tools forks")); }
      });
    });
  });
}
