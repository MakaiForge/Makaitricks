import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { app } from "electron";
import { WindowManager } from "@main/services";
import { compatWindow } from "../window";
import { cfLog } from "../debug";
import { gamesStore, gamesShopAssetsStore } from "@main/store";
import { formatGameDirName } from "@main/helpers/format-game-dir-name";
import { getGameApi } from "../catalog";
import type { IpcMain } from "electron";

const SITE_URL = app.isPackaged
  ? "https://makai-forge.store"
  : "http://localhost:8788";

async function searchCatalogCover(title: string) {
  try {
    const url = `${SITE_URL}/api/games/search?title=${encodeURIComponent(title.trim())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data?.games) return data.games;
    return [];
  } catch {
    return [];
  }
}

export function registerOpenProtonForger(ipcMain: IpcMain) {
  ipcMain.handle("open-proton-forger", async (_event, gameData?: any) => {
    cfLog(`Called with: ${JSON.stringify(gameData)}`);
    try {
      if (!gameData || !gameData.title || !gameData.exePath) {
        cfLog("No valid gameData");
      } else {
        const titleLower = gameData.title.trim().toLowerCase();
        let objectId = randomUUID();
        let shop = "custom";
        let gameKey = `${shop}:${objectId}`;
        let oldObjectId: string | null = null;

        try {
          for await (const [key, val] of gamesStore.iterator()) {
            if (val && val.title && val.title.trim().toLowerCase() === titleLower) {
              oldObjectId = val.objectId;
              cfLog(`Jogo "${val.title}" já existe (key=${key}), apagando antigo...`);
              await gamesStore.del(key);
              break;
            }
          }
        } catch (e) {
          cfLog(`Erro ao verificar duplicados: ${e}`);
        }

        if (oldObjectId) {
          const oldJsonPath = path.join(app.getPath("userData"), "games", `${oldObjectId}.json`);
          try { if (fs.existsSync(oldJsonPath)) fs.unlinkSync(oldJsonPath); } catch {}
        }

        const homePath = app.getPath("home");
        const dirName = formatGameDirName(gameData.title);
        const winePrefixPath = gameData.prefixPath || path.join(homePath, "Games", "MakaiForger", dirName);

        if (!fs.existsSync(winePrefixPath)) {
          fs.mkdirSync(winePrefixPath, { recursive: true });
        }

        let iconUrl: string | null = null;
        let heroUrl: string | null = null;
        let remoteId: string | null = null;
        let catShop: string = "custom";

        try {
          const result = await searchCatalogCover(gameData.title);
          if (result && result.length > 0) {
            const r = result[0];
            iconUrl = r.iconUrl || r.libraryImageUrl || null;
            heroUrl = r.libraryHeroImageUrl || r.libraryImageUrl || iconUrl;
            remoteId = r.objectId || null;
            catShop = r.shop || "custom";
          }
        } catch (e) {
          cfLog(`Catalog search failed: ${e}`);
        }

        if (oldObjectId) {
          const oldShopKey = `custom:${oldObjectId}`;
          await gamesShopAssetsStore.del(oldShopKey).catch(() => {});
        }

        const assets = {
          updatedAt: Date.now(),
          objectId,
          shop: catShop,
          title: gameData.title,
          iconUrl,
          libraryHeroImageUrl: heroUrl || "",
          libraryImageUrl: iconUrl || "",
          logoImageUrl: "",
          logoPosition: null,
          coverImageUrl: "",
          downloadSources: [],
          steamAppId: null,
        };
        await gamesShopAssetsStore.put(gameKey, assets);

        const game = {
          title: gameData.title,
          iconUrl,
          logoImageUrl: null,
          libraryHeroImageUrl: heroUrl,
          objectId,
          shop,
          remoteId,
          isDeleted: false,
          playTimeInMilliseconds: 0,
          lastTimePlayed: null,
          executablePath: gameData.exePath,
          launchOptions: null,
          favorite: false,
          automaticCloudSync: false,
          hasManuallyUpdatedPlaytime: false,
          winePrefixPath,
          downloadSource: "compatflow" as const,
          protonVersion: gameData.protonVersion || null,
          protonPath: gameData.protonPath || null,
        };
        await gamesStore.put(gameKey, game);

        const verify = await gamesStore.get(gameKey);
        cfLog(`Verify: ${verify ? JSON.stringify(verify).slice(0, 100) : "NULL"}`);

        const gamesDir = path.join(app.getPath("userData"), "games");
        if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir, { recursive: true });
        const jsonPath = path.join(gamesDir, `${objectId}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(game, null, 2), "utf-8");
      }

      const cfRefreshFlag = path.join(app.getPath("userData"), ".compatflow-refresh");
      try { fs.writeFileSync(cfRefreshFlag, ""); cfLog("Refresh flag written"); } catch (e) { cfLog(`Refresh flag error: ${e}`); }

      if (compatWindow && !compatWindow.isDestroyed()) {
        compatWindow.close();
        cfLog("Compat window closed");
      }

      if (WindowManager.mainWindow && !WindowManager.mainWindow.isDestroyed()) {
        WindowManager.mainWindow.restore();
        WindowManager.mainWindow.focus();
        WindowManager.mainWindow.webContents.send("on-library-batch-complete");
        cfLog("Sent refresh to existing main window");
      } else {
        await WindowManager.createMainWindow();
        cfLog("Created new main window");
        setImmediate(() => {
          WindowManager.mainWindow?.webContents.send("on-library-batch-complete");
          cfLog("Sent refresh to new main window");
        });
      }

      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
      cfLog(`ERROR: ${msg}`);
      return { success: false, error: String(error) };
    }
  });
}
