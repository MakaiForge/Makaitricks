import { WindowManager, logger } from "@main/services";

export function sendProgress(status: string, detail: string | null = null) {
  WindowManager.gameLauncherWindow?.webContents.send("preflight-progress", { status, detail });
  logger.info(`[progress] ${status}: ${detail}`);
}
