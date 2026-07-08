import { registerEvent } from "../register-event";

import { DownloadManager, logger } from "@main/services";
import { downloadsStore, storeKeys } from "@main/store";
import { GameShop } from "@types";

const resumeGameDownload = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
) => {
  const gameKey = storeKeys.game(shop, objectId);

  const download = await downloadsStore.get(gameKey);

  if (
    download &&
    (download.status === "paused" ||
      download.status === "active" ||
      download.status === "error") &&
    download.progress !== 1
  ) {
    logger.log(
      `[Downloads] Resume requested for ${gameKey} (status=${download.status}, queued=${download.queued})`
    );

    await DownloadManager.pauseDownload();

    for await (const [key, value] of downloadsStore.iterator()) {
      if (value.status === "active" && value.progress !== 1) {
        await downloadsStore.put(key, {
          ...value,
          status: "paused",
        });
      }
    }

    await DownloadManager.resumeDownload(download);

    await downloadsStore.put(gameKey, {
      ...download,
      status: "active",
      timestamp: Date.now(),
      queued: true,
    });
  }
};

registerEvent("resumeGameDownload", resumeGameDownload);
