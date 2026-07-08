import {
  logger,
  WindowManager,
} from "@main/services";
import { registerEvent } from "../register-event";
import path from "node:path";
import type { GameShop } from "@types";

import { addTrailingSlash } from "@main/helpers";
import { gamesStore, storeKeys } from "@main/store";

export const transformLudusaviBackupPathIntoWindowsPath = (
  backupPath: string,
  winePrefixPath?: string | null
) => {
  return backupPath
    .replace(winePrefixPath ? addTrailingSlash(winePrefixPath) : "", "")
    .replace("drive_c", "C:");
};

export const addWinePrefixToWindowsPath = (
  windowsPath: string,
  winePrefixPath?: string | null
) => {
  if (!winePrefixPath) {
    return windowsPath;
  }

  return path.join(winePrefixPath, windowsPath.replace("C:", "drive_c"));
};

const downloadGameArtifact = async (
  _event: Electron.IpcMainInvokeEvent,
  objectId: string,
  shop: GameShop,
  _gameArtifactId: string
) => {
  try {
    const game = await gamesStore.get(storeKeys.game(shop, objectId));

    if (!game) return;

    WindowManager.mainWindow?.webContents.send(
      `on-backup-download-complete-${objectId}-${shop}`,
      false
    );
  } catch (err) {
    logger.error("Failed to download game artifact", err);

    WindowManager.mainWindow?.webContents.send(
      `on-backup-download-complete-${objectId}-${shop}`,
      false
    );
  }
};

registerEvent("downloadGameArtifact", downloadGameArtifact);
