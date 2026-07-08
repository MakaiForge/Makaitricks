import { registerEvent } from "../register-event";
import type { GameShop } from "@types";
import { Ludusavi, Wine } from "@main/services";
import { gamesStore, storeKeys } from "@main/store";

const getGameBackupPreview = async (
  _event: Electron.IpcMainInvokeEvent,
  objectId: string,
  shop: GameShop
) => {
  const game = await gamesStore.get(storeKeys.game(shop, objectId));

  return Ludusavi.getBackupPreview(
    shop,
    objectId,
    Wine.getEffectivePrefixPath(game?.winePrefixPath, objectId)
  );
};

registerEvent("getGameBackupPreview", getGameBackupPreview);
