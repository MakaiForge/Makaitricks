import { WindowManager } from "@main/services/window-manager"

export function sendInstallProgress(status: string, percent: number) {
  WindowManager.mainWindow?.webContents.send("on-install-progress", {
    status,
    percent,
  })
}

export function sendInstallLog(line: string) {
  WindowManager.mainWindow?.webContents.send("on-install-log", line)
}
