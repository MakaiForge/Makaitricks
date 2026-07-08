import {
  downloadsStore,
  gamesShopAssetsStore,
  gamesStore,
} from "@main/store";
import type { GameShop } from "@types";

interface PrepareGameEntryParams {
  gameKey: string;
  title: string;
  objectId: string;
  shop: GameShop;
}

export const prepareGameEntry = async ({
  gameKey,
  title,
  objectId,
  shop,
}: PrepareGameEntryParams): Promise<void> => {
  let game: Record<string, unknown> | undefined;
  let gameAssets: Record<string, unknown> | undefined;
  try {
    game = await gamesStore.get(gameKey);
  } catch {
    // Game not in library yet
  }
  try {
    gameAssets = await gamesShopAssetsStore.get(gameKey);
  } catch {
    // Assets not cached yet
  }

  await downloadsStore.del(gameKey).catch(() => {});

  if (game) {
    await gamesStore.put(gameKey, {
      ...game,
      isDeleted: false,
    });
  } else {
    await gamesStore.put(gameKey, {
      title,
      iconUrl: gameAssets?.iconUrl ?? null,
      libraryHeroImageUrl: gameAssets?.libraryHeroImageUrl ?? null,
      logoImageUrl: gameAssets?.logoImageUrl ?? null,
      objectId,
      shop,
      remoteId: null,
      playTimeInMilliseconds: 0,
      lastTimePlayed: null,
      isDeleted: false,
    });
  }
};
