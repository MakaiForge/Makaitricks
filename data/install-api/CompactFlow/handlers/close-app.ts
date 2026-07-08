import type { IpcMain } from "electron";
import { compatWindow } from "../window";

export function registerCloseApp(ipcMain: IpcMain) {
  ipcMain.handle("close-app", async () => {
    if (compatWindow && !compatWindow.isDestroyed()) {
      compatWindow.close();
    }
  });
}
