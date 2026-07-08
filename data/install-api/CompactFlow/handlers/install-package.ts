import { openTerminal } from "../detect-distro";
import type { IpcMain } from "electron";

export function registerInstallPackage(ipcMain: IpcMain) {
  ipcMain.handle("install-package", async (_event, command: string) => {
    return openTerminal(command);
  });
}
