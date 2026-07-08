import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { app } from "electron";
import type { IpcMain } from "electron";

export function registerExtractIcon(ipcMain: IpcMain) {
  ipcMain.handle("extract-icon", async (_event, filePath: string) => {
    try {
      const tmpDir = app.getPath("temp");
      const outPath = path.join(tmpDir, `cf-icon-${Date.now()}.png`);
      const result = spawnSync("/usr/bin/exe-thumbnailer", ["-s", "128", filePath, outPath], { timeout: 5000 });
      if (result.status !== 0 || !fs.existsSync(outPath)) return null;
      const data = fs.readFileSync(outPath);
      fs.unlinkSync(outPath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch {
      return null;
    }
  });
}
