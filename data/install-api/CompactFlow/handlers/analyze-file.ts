import path from "node:path";
import fs from "node:fs";
import { getCompatFlowDir } from "../cf-bridge";
import { detectDistro, getInstallCmd } from "../detect-distro";
import type { IpcMain } from "electron";

export function registerAnalyzeFile(ipcMain: IpcMain) {
  const { analyze } = require(path.join(getCompatFlowDir(), "analyzer.js"));

  ipcMain.handle("analyze-file", async (_event, fp: string) => {
    const ext = path.extname(fp).toLowerCase();
    if (ext === ".xz") {
      const stat = fs.statSync(fp);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      return {
        type: "archive" as const,
        original: path.basename(fp),
        clean_name: path.basename(fp, ".xz"),
        size_mb: sizeMB,
        full_path: fp,
      };
    }
    const result = analyze(fp);
    const install_cmd = result.type === "native" && result.package
      ? getInstallCmd(result.package)
      : null;
    return { ...result, distro: detectDistro(), install_cmd };
  });
}
