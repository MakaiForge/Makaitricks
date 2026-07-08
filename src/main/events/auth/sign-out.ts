import { registerEvent } from "../register-event";
import {
  DownloadManager,
  WSClient,
  gamesPlaytime,
} from "@main/services";
import { db, downloadsStore, gamesStore, storeKeys } from "@main/store";

const signOut = async (_event: Electron.IpcMainInvokeEvent) => {
  const databaseOperations = db
    .batch([
      {
        type: "del",
        key: storeKeys.auth,
      },
      {
        type: "del",
        key: storeKeys.user,
      },
    ])
    .then(() => {
      /* Removes all games being played */
      gamesPlaytime.clear();

      return Promise.all([gamesStore.clear(), downloadsStore.clear()]);
    });

  /* Cancels any ongoing downloads */
  DownloadManager.cancelDownload();

  await databaseOperations;

  WSClient.close();
};

registerEvent("signOut", signOut);
