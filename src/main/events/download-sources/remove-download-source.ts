import { ProtonApi } from "@main/services";
import { downloadSourcesStore } from "@main/store";
import { registerEvent } from "../register-event";

const removeDownloadSource = async (
  _event: Electron.IpcMainInvokeEvent,
  removeAll = false,
  downloadSourceId?: string
) => {
  const params = new URLSearchParams({
    all: removeAll.toString(),
  });

  if (downloadSourceId) params.set("downloadSourceId", downloadSourceId);

  if (ProtonApi.isLoggedIn() && ProtonApi.hasActiveSubscription()) {
    void ProtonApi.delete(`/profile/download-sources?${params.toString()}`);
  }

  if (removeAll) {
    await downloadSourcesStore.clear();
  } else if (downloadSourceId) {
    await downloadSourcesStore.del(downloadSourceId);
  }
};

registerEvent("removeDownloadSource", removeDownloadSource);
