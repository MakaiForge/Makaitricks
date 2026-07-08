import { downloadsStore, storeKeys } from "@main/store";
import { registerEvent } from "../register-event";
import { DownloadManager } from "@main/services";
import type { GameShop } from "@types";

const pauseGameSeed = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
) => {
  const downloadKey = storeKeys.game(shop, objectId);
  const download = await downloadsStore.get(downloadKey);

  if (!download) return;

  await downloadsStore.put(downloadKey, {
    ...download,
    status: "complete",
    shouldSeed: false,
  });

  await DownloadManager.pauseSeeding(downloadKey);
};

registerEvent("pauseGameSeed", pauseGameSeed);
