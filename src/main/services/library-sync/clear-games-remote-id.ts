import { gamesStore, storeKeys } from "@main/store";

export const clearGamesRemoteIds = async () => {
  const games = await gamesStore.values().all();

  await gamesStore.batch(
    games.map((game) => ({
      type: "put",
      key: storeKeys.game(game.shop, game.objectId),
      value: {
        ...game,
        remoteId: null,
      },
    }))
  );
};
