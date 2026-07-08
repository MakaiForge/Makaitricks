import { themesStore } from "@main/store";
import { registerEvent } from "../register-event";

const getAllCustomThemes = async (_event: Electron.IpcMainInvokeEvent) => {
  return themesStore.values().all();
};

registerEvent("getAllCustomThemes", getAllCustomThemes);
