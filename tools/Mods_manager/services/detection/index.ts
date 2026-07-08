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
  const gameInfo = gameDllCatalog.findByIdOrName(gameId);
  logger.info(`[detect] Starting detection for ${gameId}. gameInfo: ${gameInfo ? gameInfo.name + " (gameId: " + gameInfo.gameId + ")" : "NOT FOUND"}`);

  if (gameInfo?.steamIds?.length) {
    for (const steamId of gameInfo.steamIds) {
      logger.info(`[detect] Trying Steam AppID ${steamId}...`);
      const steam = findSteamAppPath(steamId);
      if (steam) {
        const prefixPath = steamCompatDataPath(steam.libraryPath, steamId);
        logger.info(`[detect] ${gameId} found via Steam AppID ${steamId} at ${steam.gamePath}`);
        return { gamePath: steam.gamePath, prefixPath, source: "steam", steamAppId: steamId };
      }
      logger.info(`[detect] Steam AppID ${steamId} not found`);
    }
  }

  if (!gameInfo?.steamIds?.length) {
    logger.info(`[detect] No steamIds, trying fallback with gameId "${gameId}"`);
    const steam = findSteamAppPath(gameId);
    if (steam) {
      logger.info(`[detect] ${gameId} found via Steam (fallback ID)`);
      return { gamePath: steam.gamePath, prefixPath: null, source: "steam" };
    }
  }

  logger.info(`[detect] Trying GOG for ${gameId}...`);
  const gog = findGogGamePath(gameId, gameInfo?.name);
  if (gog) {
    logger.info(`[detect] ${gameId} found via GOG (${gog.source})`);
    return { gamePath: gog.gamePath, prefixPath: null, source: "gog" };
  }

  if (gameInfo?.detectExe) {
    logger.info(`[detect] Trying manual scan for ${gameId} (exe: ${gameInfo.detectExe})`);
    const manual = detectManual(gameInfo.detectExe, gameInfo.detectExeAlts);
    if (manual) {
      logger.info(`[detect] ${gameId} found via manual scan at ${manual}`);
      return { gamePath: manual, prefixPath: null, source: "manual" };
    }
  }

  logger.info(`[detect] ${gameId} not found via any method`);
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
