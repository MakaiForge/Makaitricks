import { createWineToolRunner, WineTool } from "@main/services/wine-tools";
import { registerEvent } from "@main/events/register-event";
import { spawn, execFileSync } from "node:child_process";
import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { logsPath } from "@main/constants";
import type { GameShop } from "@types";
import { getVenvPythonPath } from "@prefix/core/venv";

const getPythonBin = (): string | null => {
  const candidates = [
    process.env.PROTONFORGE_UMU_PYTHON,
    process.env.HYDRA_UMU_PYTHON,
    getVenvPythonPath(),
    "/usr/bin/python3",
    "python3",
  ];

  for (const c of candidates) {
    if (!c) continue;
    try {
      const resolved = fs.realpathSync(c);
      execFileSync(resolved, ["--version"], { stdio: "pipe" });
      return resolved;
    } catch {
      continue;
    }
  }
  return null;
};

const getGUIScriptPath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "python", "wine_log_gui.py")
    : path.join(__dirname, "..", "..", "resources", "python", "wine_log_gui.py");

const runWineTool = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  tool: string
): Promise<boolean> => {
  try {
    if (tool === "winelog") {
      const pythonBin = getPythonBin();
      const guiScript = getGUIScriptPath();
      if (pythonBin && guiScript) {
        const umuLogPath = path.join(logsPath, "umu.log");
        const child = spawn(pythonBin, [guiScript, "--tail", umuLogPath], {
          stdio: ["ignore", "ignore", "pipe"],
          detached: true,
        });
        child.unref();
        child.on("error", (err) => {
          console.error("[run-wine-tool] Failed to spawn Python log GUI:", err);
        });
        child.stderr?.on("data", (data) => {
          console.error("[run-wine-tool] Python GUI stderr:", data.toString());
        });
        return true;
      }
      console.error("[run-wine-tool] Python or script not found:", { pythonBin, guiScript });
      return false;
    }

    const runner = await createWineToolRunner({
      shop,
      objectId,
    });

    const result = await runner.run(tool as WineTool);
    return result.success;
  } catch (error) {
    console.error("Failed to run wine tool:", error);
    return false;
  }
};

registerEvent("runWineTool", runWineTool);
