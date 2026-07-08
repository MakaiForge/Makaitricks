import { themesStore } from "@main/store";
import { registerEvent } from "../register-event";

const getActiveCustomTheme = async () => {
  const allThemes = await themesStore.values().all();
  return allThemes.find((theme) => theme.isActive);
};

registerEvent("getActiveCustomTheme", getActiveCustomTheme);
