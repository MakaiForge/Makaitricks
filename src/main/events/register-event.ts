import { ipcMain } from "electron";
import { logger } from "@main/services";

export const registerEvent = (
  name: string,
  listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any
) => {
  ipcMain.handle(name, async (event: Electron.IpcMainInvokeEvent, ...args) => {
    try {
      const result = await listener(event, ...args);
      if (!result) return result;
      return JSON.parse(JSON.stringify(result));
    } catch (err) {
      logger.error(`[IPC] Handler "${name}" failed:`, err);
      throw err;
    }
  });
};
