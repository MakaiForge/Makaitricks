import { themesStore } from "@main/store";
import { registerEvent } from "../register-event";
import { WindowManager } from "@main/services";

const updateCustomTheme = async (
  _event: Electron.IpcMainInvokeEvent,
  themeId: string,
  code: string
) => {
  const theme = await themesStore.get(themeId);

  if (!theme) {
    throw new Error("Theme not found");
  }

  await themesStore.put(themeId, {
    ...theme,
    code,
    updatedAt: new Date(),
  });

  if (theme.isActive) {
    WindowManager.mainWindow?.webContents.send("on-custom-theme-updated");
    WindowManager.notificationWindow?.webContents.send(
      "on-custom-theme-updated"
    );
  }
};

registerEvent("updateCustomTheme", updateCustomTheme);
