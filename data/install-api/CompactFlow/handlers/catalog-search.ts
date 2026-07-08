import { searchGamesApi, enrichGame } from "../catalog";
import type { IpcMain } from "electron";

export function registerCatalogSearch(ipcMain: IpcMain) {
  ipcMain.handle("catalog-search", async (_event, gameName: string) => {
    const games = await searchGamesApi(gameName, 5);
    return games.map(enrichGame);
  });
}
