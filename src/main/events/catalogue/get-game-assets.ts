import type { GameShop } from "@types";
import { registerEvent } from "../register-event";
import { gamesShopAssetsStore, storeKeys } from "@main/store";
import { getGameDetails } from "../misc/helpers/steam-local";
import { handleGetSourceNamesForTitle } from "@main/services/local-sources-handler";
import { MakaiApi } from "@main/services/makai-api";

export const getGameAssets = async (objectId: string, shop: GameShop) => {
  const apiGame = await MakaiApi.getGame(objectId);
  if (apiGame) {
    return {
      objectId,
      shop,
      title: apiGame.title,
      iconUrl: apiGame.libraryImageUrl || null,
      libraryImageUrl: apiGame.libraryImageUrl || null,
      libraryHeroImageUrl: apiGame.libraryHeroImageUrl || null,
      logoImageUrl: apiGame.libraryImageUrl || null,
      coverImageUrl: null,
      logoPosition: null,
      downloadSources: apiGame.downloadSources || [],
      downloads: apiGame.downloads || [],
      screenshots: apiGame.screenshots || [],
      shortDescription: apiGame.shortDescription || null,
      pcRequirements: apiGame.pcRequirements || null,
      updatedAt: Date.now(),
    };
  }

  if (shop === "steam") {
    try {
      const details = await getGameDetails(objectId);
      if (!details) return null;

      const downloadSources = handleGetSourceNamesForTitle(details.title);

      return {
        objectId,
        shop,
        title: details.title,
        iconUrl: details.iconUrl || null,
        libraryHeroImageUrl: details.libraryHeroImageUrl || null,
        libraryImageUrl: details.libraryImageUrl || null,
        logoImageUrl: details.logoImageUrl || null,
        coverImageUrl: null,
        logoPosition: null,
        downloadSources,
        updatedAt: Date.now(),
      };
    } catch {
      return null;
    }
  }

  const gameKey = storeKeys.game(shop, objectId);
  return (await gamesShopAssetsStore.get(gameKey)) || null;
};

const getGameAssetsEvent = async (
  _event: Electron.IpcMainInvokeEvent,
  objectId: string,
  shop: GameShop
) => {
  return getGameAssets(objectId, shop);
};

registerEvent("getGameAssets", getGameAssetsEvent);
