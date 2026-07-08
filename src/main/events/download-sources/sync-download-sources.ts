import { registerEvent } from "../register-event";
import { downloadSourcesStore } from "@main/store";
import { handleGetDownloadSources } from "@main/services/local-sources-handler";

const syncDownloadSources = async (_event: Electron.IpcMainInvokeEvent) => {
  const localSources = handleGetDownloadSources();
  for (const src of localSources) {
    await downloadSourcesStore.put(src.id, src as any).catch(() => {});
  }
};

registerEvent("syncDownloadSources", syncDownloadSources);
