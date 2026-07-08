import { Theme } from "@types";
import { registerEvent } from "../register-event";
import { themesStore } from "@main/store";

const addCustomTheme = async (
  _event: Electron.IpcMainInvokeEvent,
  theme: Theme
) => {
  await themesStore.put(theme.id, theme);
};

registerEvent("addCustomTheme", addCustomTheme);
