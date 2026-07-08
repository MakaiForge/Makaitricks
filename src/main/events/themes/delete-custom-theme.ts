import { themesStore } from "@main/store";
import { themeCache } from "@main/theme/ThemeCache";
import { registerEvent } from "../register-event";
import type { Theme } from "@types";

const deleteCustomTheme = async (
  _event: Electron.IpcMainInvokeEvent,
  themeId: string
) => {
  const theme = (await themesStore.get(themeId)) as Theme | null;
  if (theme) {
    await themeCache.removeFromCache(theme);
  }
  await themesStore.del(themeId);
};

registerEvent("deleteCustomTheme", deleteCustomTheme);
