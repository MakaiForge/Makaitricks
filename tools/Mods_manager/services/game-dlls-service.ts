import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GameDllCatalog, GameDllEntry } from "../data/game-dlls";

const _dirname = path.dirname(fileURLToPath(import.meta.url));
let _catalog: GameDllCatalog | null = null;

function catalogPath(): string {
  return path.join(_dirname, "..", "data", "game-dlls.json");
}

function loadCatalog(): GameDllCatalog {
  if (_catalog) return _catalog;
  const filePath = catalogPath();
  if (!fs.existsSync(filePath)) {
    _catalog = { _version: 1, _comment: "", games: [] };
    return _catalog;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  _catalog = JSON.parse(raw) as GameDllCatalog;
  return _catalog;
}

export function getGameDllCatalog(): GameDllCatalog {
  return loadCatalog();
}

export function getGameDllInfo(gameId: string): GameDllEntry | undefined {
  const catalog = loadCatalog();
  return catalog.games.find((g) => g.gameId === gameId);
}

export function findGameBySteamId(steamId: string): GameDllEntry | undefined {
  const catalog = loadCatalog();
  return catalog.games.find((g) => g.steamIds.includes(steamId));
}

export function findGameByExe(exeName: string): GameDllEntry | undefined {
  const catalog = loadCatalog();
  const lower = exeName.toLowerCase();
  return catalog.games.find(
    (g) =>
      g.detectExe.toLowerCase() === lower ||
      g.detectExeAlts?.some((a) => a.toLowerCase() === lower)
  );
}

export const gameDllCatalog = {
  getAll: getGameDllCatalog,
  getGame: getGameDllInfo,
  findBySteamId: findGameBySteamId,
  findByExe: findGameByExe,
};
