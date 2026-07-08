import { themesStore } from "@main/store";
import { registerEvent } from "../register-event";
import { WindowManager } from "@main/services";

const toggleCustomTheme = async (
  _event: Electron.IpcMainInvokeEvent,
  themeId: string,
  isActive: boolean
) => {
  const theme = await themesStore.get(themeId);

  if (!theme) {
    throw new Error("Theme not found");
  }

  await themesStore.put(themeId, {
    ...theme,
    isActive,
    updatedAt: new Date(),
  });

  WindowManager.mainWindow?.webContents.send("on-custom-theme-updated");
  WindowManager.notificationWindow?.webContents.send("on-custom-theme-updated");
};

registerEvent("toggleCustomTheme", toggleCustomTheme);
