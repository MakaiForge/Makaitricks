import { registerEvent } from "../register-event";
import { getThemeSoundPath } from "@main/helpers";
import { themesStore } from "@main/store";

const getThemeSoundPathEvent = async (
  _event: Electron.IpcMainInvokeEvent,
  themeId: string
): Promise<string | null> => {
  const theme = await themesStore.get(themeId);
  return getThemeSoundPath(themeId, theme?.name);
};

registerEvent("getThemeSoundPath", getThemeSoundPathEvent);
