import { registerEvent } from "../register-event";
import { GameLogManager } from "@main/services/game-log-manager";
import type { GameShop } from "@types";

const clearGameLog = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
): Promise<void> => {
  GameLogManager.clear(shop, objectId);
};

registerEvent("clearGameLog", clearGameLog);
