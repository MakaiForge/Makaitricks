import { registerEvent } from "@main/events/register-event";
import { deleteGamePrefix } from "../core/clear";
import { deleteGameFromDatabase } from "@main/services/delete-game";
import type { GameShop } from "@types";

const deleteGamePrefixHandler = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
): Promise<void> => {
  await deleteGamePrefix(shop, objectId);
};

const deleteGameWithPrefixHandler = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
): Promise<void> => {
  await deleteGamePrefix(shop, objectId);
  await deleteGameFromDatabase(shop, objectId);
};

registerEvent("deleteGamePrefix", deleteGamePrefixHandler);
registerEvent("deleteGameWithPrefix", deleteGameWithPrefixHandler);
