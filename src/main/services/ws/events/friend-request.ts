import { WindowManager } from "@main/services/window-manager";

export const friendRequestEvent = async (payload: any) => {
  WindowManager.mainWindow?.webContents.send("on-sync-friend-requests", {
    friendRequestCount: payload.friendRequestCount,
  });
};
