import { themesStore } from "@main/store";
import { themeCache } from "@main/theme/ThemeCache";
import { registerEvent } from "../register-event";
import type { Theme } from "@types";

const deleteAllCustomThemes = async (_event: Electron.IpcMainInvokeEvent) => {
  const allThemes = (await themesStore.values().all()) as Theme[];
  for (const theme of allThemes) {
    await themeCache.removeFromCache(theme);
  }
  await themesStore.clear();
};

registerEvent("deleteAllCustomThemes", deleteAllCustomThemes);
