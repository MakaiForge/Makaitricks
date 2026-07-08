import { registerEvent } from "../register-event";

import { DownloadManager } from "@main/services";
import { GameShop } from "@types";
import { downloadsStore, storeKeys } from "@main/store";

const pauseGameDownload = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
) => {
  const gameKey = storeKeys.game(shop, objectId);

  const download = await downloadsStore.get(gameKey);

  if (download) {
    await DownloadManager.pauseDownload(gameKey);

    await downloadsStore.put(gameKey, {
      ...download,
      status: "paused",
      queued: false,
    });
  }
};

registerEvent("pauseGameDownload", pauseGameDownload);
