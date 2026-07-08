import { registerEvent } from "../register-event";
import { downloadsStore, storeKeys } from "@main/store";
import { GameShop } from "@types";
import { orderBy } from "lodash-es";

const updateDownloadQueuePosition = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  direction: "up" | "down"
) => {
  const gameKey = storeKeys.game(shop, objectId);

  const download = await downloadsStore.get(gameKey);

  if (!download?.queued || download.status !== "paused") {
    return false;
  }

  const allDownloads = await downloadsStore.values().all();

  const queuedDownloads = orderBy(
    allDownloads.filter((d) => d.status === "paused" && d.queued),
    "timestamp",
    "desc"
  );

  const currentIndex = queuedDownloads.findIndex(
    (d) => d.shop === shop && d.objectId === objectId
  );

  if (currentIndex === -1) {
    return false;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= queuedDownloads.length) {
    return false;
  }

  const currentDownload = queuedDownloads[currentIndex];
  const adjacentDownload = queuedDownloads[targetIndex];

  const currentKey = storeKeys.game(
    currentDownload.shop,
    currentDownload.objectId
  );
  const adjacentKey = storeKeys.game(
    adjacentDownload.shop,
    adjacentDownload.objectId
  );

  const tempTimestamp = currentDownload.timestamp;
  await downloadsStore.put(currentKey, {
    ...currentDownload,
    timestamp: adjacentDownload.timestamp,
  });
  await downloadsStore.put(adjacentKey, {
    ...adjacentDownload,
    timestamp: tempTimestamp,
  });

  return true;
};

registerEvent("updateDownloadQueuePosition", updateDownloadQueuePosition);
