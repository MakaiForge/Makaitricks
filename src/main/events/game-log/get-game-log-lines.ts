import { registerEvent } from "../register-event";
import { GameLogManager } from "@main/services/game-log-manager";
import type { GameShop } from "@types";

const getGameLogLines = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
): Promise<string[]> => {
  return GameLogManager.getLines(shop, objectId);
};

registerEvent("getGameLogLines", getGameLogLines);
