import { downloadsStore, storeKeys } from "@main/store";
import { registerEvent } from "../register-event";
import { DownloadManager } from "@main/services";
import type { GameShop } from "@types";

const resumeGameSeed = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
) => {
  const downloadKey = storeKeys.game(shop, objectId);
  const download = await downloadsStore.get(downloadKey);

  if (!download) return;

  await downloadsStore.put(downloadKey, {
    ...download,
    status: "seeding",
    shouldSeed: true,
  });

  await DownloadManager.resumeSeeding(download);
};

registerEvent("resumeGameSeed", resumeGameSeed);
