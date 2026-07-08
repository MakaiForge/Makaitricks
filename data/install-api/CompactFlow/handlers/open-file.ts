import { dialog, BrowserWindow } from "electron";
import type { IpcMain } from "electron";

export function registerOpenFile(ipcMain: IpcMain) {
  ipcMain.handle("open-file", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [
        { name: "Executáveis Windows", extensions: ["exe", "msi"] },
        { name: "Todos os ficheiros", extensions: ["*"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
