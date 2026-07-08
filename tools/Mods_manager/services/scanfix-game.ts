import fs from "node:fs";
import path from "node:path";
import { ModStorageService, logger } from "@main/services";
import { getGameModule, getGameInfo } from "@games/registry";
import { applyWineDllOverrides } from "@games/_shared/prefix";
import { seedBethesdaRegistry, verifyBethesdaRegistry } from "@prefix/core/bethesda-registry";
import type { ScanFixResult } from "@prefix/types";
import { downloadSkse } from "./skse-downloader";
import { resolvePrefixDir, isValidPrefix, cleanNestedPfx, dllOverridesMatch } from "./prefix-validator";
import { defaultStagingDir, defaultPrefixDir, steamCompatDataPath, findSteamAppPath } from "./steam-library";
import { detectGame } from "./detection";

export async function scanFixGame(gameId: string): Promise<ScanFixResult> {
  let config = ModStorageService.get<any>(`game:${gameId}:config`);
  let gamePath = config?.gamePath;
  const info = getGameInfo(gameId);

  if (!gamePath) {
    const detected = detectGame(gameId);
    if (detected.source && detected.gamePath) {
      gamePath = detected.gamePath;
      const staging = defaultStagingDir(gameId);
      const prefix = detected.prefixPath || defaultPrefixDir(gameId);
      ModStorageService.put(`game:${gameId}:config`, {
        gamePath,
        stagingDir: staging,
        protonPrefix: prefix,
        protonVersion: "",
      });
    } else {
      return {
        found: false,
        steamAppId: info?.steamAppId,
        error: "Jogo não encontrado na Steam, GOG ou diretórios comuns. Configure manualmente em Configurações do Jogo.",
      };
    }
  }

  if (!gamePath) {
    return { found: false, error: "Caminho do jogo não encontrado." };
  }

  config = ModStorageService.get<any>(`game:${gameId}:config`);
  let prefixPath = config?.protonPrefix;
  if (!prefixPath) {
    if (info?.steamAppId) {
      const found = findSteamAppPath(info.steamAppId);
      if (found) {
        const steamPrefix = steamCompatDataPath(found.libraryPath, info.steamAppId);
        if (steamPrefix) prefixPath = steamPrefix;
      }
    }
    if (!prefixPath) prefixPath = defaultPrefixDir(gameId);
    ModStorageService.put(`game:${gameId}:config`, { ...config, protonPrefix: prefixPath });
  }

  const actualPfx = resolvePrefixDir(prefixPath);
  const prefixValid = actualPfx ? isValidPrefix(actualPfx) : false;

  if (!prefixValid) {
    logger.warn(`Prefix invalid at ${prefixPath}, will recreate`);
    if (actualPfx && fs.existsSync(actualPfx)) {
      try {
        const entries = fs.readdirSync(actualPfx);
        for (const entry of entries) {
          fs.rmSync(path.join(actualPfx, entry), { recursive: true, force: true });
        }
      } catch {}
    }
    const { ensurePrefixDir } = await import("@prefix/core/validate");
    ensurePrefixDir(prefixPath);
  } else {
    cleanNestedPfx(actualPfx!);
  }

  const mod = getGameModule(gameId, gamePath);
  const requiredOverrides = mod.getWineDllOverrides?.();
  if (requiredOverrides && Object.keys(requiredOverrides).length > 0) {
    const matches = dllOverridesMatch(prefixPath, requiredOverrides);
    if (!matches) {
      logger.info(`DLL overrides mismatch for ${gameId}, applying`);
      applyWineDllOverrides(prefixPath, requiredOverrides);
    } else {
      logger.info(`DLL overrides already correct for ${gameId}`);
    }
  }

  if (mod.bethesdaRegistryName && prefixPath) {
    const registryOk = verifyBethesdaRegistry(prefixPath, mod.bethesdaRegistryName, gamePath);
    if (!registryOk) {
      logger.info(`Bethesda registry missing or wrong for ${gameId}, seeding`);
      seedBethesdaRegistry(prefixPath, gamePath, mod.bethesdaRegistryName);
    } else {
      logger.info(`Bethesda registry already correct for ${gameId}`);
    }
  }

  const skseFound = await downloadSkse(gameId, gamePath);

  return {
    found: true,
    gamePath,
    steamAppId: info?.steamAppId,
    skseFound,
    configSaved: true,
  };
}
