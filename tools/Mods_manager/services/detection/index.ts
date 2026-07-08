import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { findSteamAppPath, steamCompatDataPath } from "../steam-library";
import { findGogGamePath } from "../gog-detection";
import { gameDllCatalog } from "../game-dlls-service";
import { logger } from "@main/services";

export interface DetectionResult {
  gamePath: string;
  prefixPath: string | null;
  source: "steam" | "gog" | "manual" | null;
  steamAppId?: string;
}

export function detectGame(gameId: string): DetectionResult {
  const gameInfo = gameDllCatalog.getGame(gameId);

  if (gameInfo?.steamIds?.length) {
    for (const steamId of gameInfo.steamIds) {
      const steam = findSteamAppPath(steamId);
      if (steam) {
        const prefixPath = steamCompatDataPath(steam.libraryPath, steamId);
        logger.info(`[detect] ${gameId} found via Steam AppID ${steamId}`);
        return { gamePath: steam.gamePath, prefixPath, source: "steam", steamAppId: steamId };
      }
    }
  }

  if (!gameInfo?.steamIds?.length) {
    const steam = findSteamAppPath(gameId);
    if (steam) {
      logger.info(`[detect] ${gameId} found via Steam (fallback ID)`);
      return { gamePath: steam.gamePath, prefixPath: null, source: "steam" };
    }
  }

  const gog = findGogGamePath(gameId);
  if (gog) {
    logger.info(`[detect] ${gameId} found via GOG (${gog.source})`);
    return { gamePath: gog.gamePath, prefixPath: null, source: "gog" };
  }

  if (gameInfo?.detectExe) {
    const manual = detectManual(gameInfo.detectExe, gameInfo.detectExeAlts);
    if (manual) {
      logger.info(`[detect] ${gameId} found via manual scan`);
      return { gamePath: manual, prefixPath: null, source: "manual" };
    }
  }

  return { gamePath: "", prefixPath: null, source: null };
}

function detectManual(detectExe: string, alts?: string[]): string | null {
  const home = os.homedir();
  const candidates = [
    path.join(home, "Games"),
    path.join(home, "GOG Games"),
    path.join(home, ".local", "share", "Steam", "steamapps", "common"),
    path.join(home, "snap", "steam", "common", ".local", "share", "Steam", "steamapps", "common"),
    path.join(home, ".var", "app", "com.valvesoftware.Steam", "data", "steam", "steamapps", "common"),
    "/mnt",
    "/media",
  ];

  const exes = [detectExe, ...(alts || [])];
  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    try {
      const dirs = fs.readdirSync(base);
      for (const dir of dirs) {
        const gameDir = path.join(base, dir);
        if (!fs.statSync(gameDir).isDirectory()) continue;
        for (const exe of exes) {
          if (fs.existsSync(path.join(gameDir, exe))) {
            return gameDir;
          }
        }
      }
    } catch { continue; }
  }
  return null;
}
