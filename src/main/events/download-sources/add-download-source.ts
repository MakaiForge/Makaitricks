import { registerEvent } from "../register-event";
import { ProtonApi } from "@main/services/forger-api";
import { downloadSourcesStore } from "@main/store";
import type { DownloadSource } from "@types";
import { logger } from "@main/services";

const addDownloadSource = async (
  _event: Electron.IpcMainInvokeEvent,
  url: string
) => {
  try {
    const existingSources = await downloadSourcesStore.values().all();
    const urlExists = existingSources.some((source) => source.url === url);

    if (urlExists) {
      throw new Error("Download source with this URL already exists");
    }

    const downloadSource = await ProtonApi.post<DownloadSource>(
      "/download-sources",
      {
        url,
      },
      { needsAuth: false }
    );

    if (!downloadSource) throw new Error("Failed to add download source");

    await downloadSourcesStore.put(downloadSource.id, {
      ...downloadSource,
      isRemote: true,
      createdAt: new Date().toISOString(),
    });

    return downloadSource;
  } catch (error) {
    logger.error("Failed to add download source:", error);
    throw error;
  }
};

registerEvent("addDownloadSource", addDownloadSource);
