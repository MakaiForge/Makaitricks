import { downloadSourcesStore } from "@main/store";
import { registerEvent } from "../register-event";
import { orderBy } from "lodash-es";

const getDownloadSources = async (_event: Electron.IpcMainInvokeEvent) => {
  const allSources = await downloadSourcesStore.values().all();
  return orderBy(allSources, "createdAt", "desc");
};

registerEvent("getDownloadSources", getDownloadSources);
