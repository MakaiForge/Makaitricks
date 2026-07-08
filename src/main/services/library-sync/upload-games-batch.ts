import { mergeWithRemoteGames } from "./merge-with-remote-games";
import { WindowManager } from "../window-manager";

export const uploadGamesBatch = async () => {
  await mergeWithRemoteGames();

  if (WindowManager.mainWindow)
    WindowManager.mainWindow.webContents.send("on-library-batch-complete");
};
