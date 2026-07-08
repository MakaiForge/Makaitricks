import { themesStore } from "@main/store";
import { registerEvent } from "../register-event";

const getCustomThemeById = async (
  _event: Electron.IpcMainInvokeEvent,
  themeId: string
) => {
  return themesStore.get(themeId);
};

registerEvent("getCustomThemeById", getCustomThemeById);
