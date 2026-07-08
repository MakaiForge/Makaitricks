import { shell } from "electron";
import path from "node:path";
import fs from "node:fs";

import { getDownloadsPath } from "@main/events/helpers/get-downloads-path";
import { registerEvent } from "@main/events/register-event";
import { downloadsStore, gamesStore, storeKeys } from "@main/store";
import { GameShop } from "@types";
import { Wine, logger, WindowManager } from "@main/services";
import { installAndScan } from "../orchestrator/orchestrator";
import { setupPrefix, resolveActualPrefix } from "../orchestrator/prefix-setup";
import { copyFolderToPrefix } from "../orchestrator/prefix-copier";
import { scanPrefixForExes } from "../orchestrator/prefix-scanner";
import { findExesInFolder } from "@main/helpers/find-exe-in-folder";
import { ProtonRecommendationService } from "@provision/proton_recommended/services/proton-recommendation";
import { ensureWinetricks } from "@provision/ensure-Makaitricks";
import { debugLog } from "@provision/debug-log";
import type { InstallCandidate, InstallOptions, InstallResult } from "../orchestrator/types";

async function findGameFolder(gameTitle: string | null): Promise<string | null> {
  const dlPath = await getDownloadsPath();
  if (!fs.existsSync(dlPath)) return null;
  const entries = fs.readdirSync(dlPath, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name.toLowerCase();
    const title = (gameTitle ?? "").toLowerCase();
    if (title && (name.includes(title) || title.includes(name))) {
      return path.join(dlPath, e.name);
    }
  }
  return null;
}

const INSTALLER_PATTERNS = [/setup/i, /install/i, /msi/i];

function findInstallerInFolder(folderPath: string): string | null {
  const scanDir = (dir: string, depth: number): string | null => {
    if (depth > 2) return null;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          const found = scanDir(full, depth + 1);
          if (found) return found;
        } else if (e.isFile() && e.name.toLowerCase().endsWith(".exe")) {
          if (INSTALLER_PATTERNS.some((p) => p.test(e.name))) return full;
        }
      }
    } catch {
      /* skip unreadable dirs */
    }
    return null;
  };
  return scanDir(folderPath, 0);
}

function findExactInstaller(folderPath: string, exeName: string): string | null {
  const scanDir = (dir: string, depth: number): string | null => {
    if (depth > 2) return null;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          const found = scanDir(full, depth + 1);
          if (found) return found;
        } else if (e.isFile()) {
          const name = e.name.toLowerCase();
          const target = exeName.toLowerCase();
          if (name === target || name === `_download_${target}`) {
            return full;
          }
        }
      }
    } catch { /* skip unreadable dirs */ }
    return null;
  };
  return scanDir(folderPath, 0);
}

function matchExeByName(candidates: InstallCandidate[], exeName: string): string | null {
  const targetName = path.basename(exeName).toLowerCase();
  if (!targetName) return null;
  for (const c of candidates) {
    if (c.name.toLowerCase() === targetName) return c.path;
  }
  for (const c of candidates) {
    if (c.name.toLowerCase().includes(targetName) || targetName.includes(c.name.toLowerCase())) {
      return c.path;
    }
  }
  return null;
}

function returnOrSelect(
  shop: GameShop,
  objectId: string,
  result: InstallResult,
  gameTitle: string,
  gameKey: string,
  prefixDriveCPath: string,
  existingExePath?: string
): InstallResult {
  if (existingExePath && result.candidates.length > 0) {
    const matched = matchExeByName(result.candidates, existingExePath);
    if (matched) {
      return { wasOpened: true, candidates: [], suggestedDir: null, autoSetExe: matched };
    }
  }
  if (result.candidates.length > 0) {
    WindowManager.createExecutableSelectWindow({
      shop,
      objectId,
      candidates: result.candidates.map((c) => ({
        path: c.path,
        name: c.name,
        size: c.size,
      })),
      suggestedDir: result.suggestedDir,
      prefixDriveCPath,
      gameTitle,
      gameKey,
    });
    WindowManager.showExecutableSelectWindow();
    return { wasOpened: true, candidates: [], suggestedDir: null, executableSelectWindowOpened: true };
  }
  return result;
}

export const openGameInstaller = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  protonPath?: string | null,
  gameTitle?: string | null,
  folderName?: string | null
): Promise<InstallResult> => {
  const downloadKey = storeKeys.game(shop, objectId);
  const download = folderName
    ? { folderName }
    : await downloadsStore.get(downloadKey).catch(() => null);
  const game = await gamesStore.get(downloadKey).catch(() => null);

  const effectiveProtonPath = protonPath || null;
  const effectiveGameTitle = gameTitle || game?.title || null;
  const effectiveWinePrefixPath = Wine.getEffectivePrefixPath(null, objectId, effectiveGameTitle);

  debugLog.log("open_game_installer_start", {
    shop,
    objectId,
    gameTitle: effectiveGameTitle,
    protonPath: effectiveProtonPath,
    winePrefixPath: effectiveWinePrefixPath,
    folderName: download?.folderName,
    gameFromStore: !!game,
    installConfig: game?.installConfig,
  });

  if (objectId && effectiveProtonPath && effectiveWinePrefixPath) {
    await setupPrefix(objectId, effectiveProtonPath, effectiveWinePrefixPath);
  }

  const resolvedPrefix = effectiveWinePrefixPath ? resolveActualPrefix(effectiveWinePrefixPath) : null;

  debugLog.log("open_game_installer_prefix_resolved", {
    original: effectiveWinePrefixPath,
    resolved: resolvedPrefix,
  });

  /* salva o protonPath no jogo pra setGameExecutablePath usar depois */
  if (objectId && effectiveProtonPath && game && !game.protonPath) {
    game.protonPath = effectiveProtonPath;
    game.protonVersion = path.basename(effectiveProtonPath);
    await gamesStore.put(downloadKey, game).catch(() => {});
  }

  let gamePath: string | null = null;

  if (download?.folderName) {
    gamePath = path.join(download.downloadPath ?? (await getDownloadsPath()), download.folderName);
  } else if (effectiveGameTitle) {
    gamePath = await findGameFolder(effectiveGameTitle);
  }

  const extractOnly = !!(game?.installerConfig as any)?.extract_only;
  const installerExeName = (game?.installerConfig as any)?.exe_name || "";
  const existingExePath = game?.executablePath || "";

  debugLog.log("open_game_installer_extract_only", { extractOnly });
  debugLog.log("open_game_installer_installer_exe_name", { installerExeName });
  debugLog.log("open_game_installer_existing_exe", { existingExePath });

  debugLog.log("open_game_installer_game_path", { gamePath, exists: gamePath ? fs.existsSync(gamePath) : false });

  if (!gamePath || !fs.existsSync(gamePath)) {
    const suggestedDir = effectiveWinePrefixPath || (effectiveGameTitle ? Wine.getProtonForgerPrefixPath(effectiveGameTitle) : null);
    debugLog.log("open_game_installer_no_path", { suggestedDir });
    return { wasOpened: true, candidates: [], suggestedDir };
  }

  const scriptVerbs: string[] = [
    ...(game?.installConfig?.winetricks || []),
    ...((game as any)?.gameDlls || []),
  ];

  const baseOptions: InstallOptions = {
    gameId: objectId,
    winePrefixPath: effectiveWinePrefixPath,
    protonPath: effectiveProtonPath,
    gameTitle: effectiveGameTitle,
    gameKey: downloadKey,
    shop,
    objectId,
    winetricksVerbs: scriptVerbs.length > 0 ? scriptVerbs : undefined,
    installConfig: game?.installConfig,
  };

  debugLog.log("open_game_installer_options", baseOptions as unknown as Record<string, unknown>);

  const prefixDriveCPath = resolvedPrefix
    ? path.join(resolvedPrefix, "drive_c")
    : "";

  /* ─── ARQUIVO ÚNICO (.exe / .msi) — Modo 1 ─── */
  if (fs.lstatSync(gamePath).isFile()) {
    const ext = path.extname(gamePath).toLowerCase();
    if (ext === ".exe" || ext === ".msi") {
      const result = await installAndScan(gamePath, baseOptions);
      return returnOrSelect(shop, objectId, result, effectiveGameTitle || "", downloadKey, prefixDriveCPath, existingExePath);
    }
    shell.showItemInFolder(gamePath);
    return { wasOpened: true, candidates: [], suggestedDir: null };
  }

  /* ─── PASTA — Modo 2 ─────────────────────────── */

  /* Se extract_only, não procura instalador — copia direto pro prefixo */
  if (extractOnly) {
    debugLog.log("open_game_installer_extract_only_mode", { gamePath, resolvedPrefix });
    if (resolvedPrefix) {
      if (objectId && effectiveProtonPath && scriptVerbs.length > 0) {
        try {
          const wtPath = await ensureWinetricks();
          await ProtonRecommendationService.installGameDlls(
            objectId,
            resolvedPrefix,
            effectiveProtonPath,
            scriptVerbs,
            wtPath,
          );
        } catch { /* DLLs não críticas */ }
      }
      await copyFolderToPrefix(gamePath, resolvedPrefix, (pct) => {
        WindowManager.mainWindow?.webContents.send("on-install-progress", {
          status: `Copiando jogo para o prefixo... ${pct}%`,
          percent: pct,
        });
      });
      const scanResult = scanPrefixForExes(resolvedPrefix);
      if (scanResult.candidates.length > 0) {
        return returnOrSelect(shop, objectId, { wasOpened: true, ...scanResult }, effectiveGameTitle || "", downloadKey, prefixDriveCPath, existingExePath);
      }
    }
    const folderExes = findExesInFolder(gamePath);
    if (folderExes.candidates.length > 0) {
      return returnOrSelect(shop, objectId, {
        wasOpened: true,
        candidates: folderExes.candidates,
        suggestedDir: folderExes.suggestedDir,
      }, effectiveGameTitle || "", downloadKey, prefixDriveCPath, existingExePath);
    }
    return { wasOpened: true, candidates: [], suggestedDir: gamePath };
  }

  /* Procura instalador pelo nome exato (installer.exe_name) ou por padrões */
  let targetInstaller: string | null = null;

  if (installerExeName) {
    targetInstaller = findExactInstaller(gamePath, installerExeName);
    debugLog.log("open_game_installer_exact_installer_search", { installerExeName, found: !!targetInstaller });
  }

  if (!targetInstaller) {
    targetInstaller = findInstallerInFolder(gamePath);
    debugLog.log("open_game_installer_heuristic_installer_search", { found: !!targetInstaller });
  }

  if (targetInstaller) {
    const result = await installAndScan(targetInstaller, baseOptions);
    return returnOrSelect(shop, objectId, result, effectiveGameTitle || "", downloadKey, prefixDriveCPath, existingExePath);
  }

  /* sem installer → portável: instala DLLs, copia pasta pro prefixo e escaneia */
  if (resolvedPrefix) {
    if (objectId && effectiveProtonPath && scriptVerbs.length > 0) {
      try {
        const wtPath = await ensureWinetricks();
        await ProtonRecommendationService.installGameDlls(
          objectId,
          resolvedPrefix,
          effectiveProtonPath,
          scriptVerbs,
          wtPath,
        );
      } catch {
        /* DLLs não são críticas pra jogos portáteis */
      }
    }
    await copyFolderToPrefix(gamePath, resolvedPrefix, (pct) => {
      WindowManager.mainWindow?.webContents.send("on-install-progress", {
        status: `Copiando jogo para o prefixo... ${pct}%`,
        percent: pct,
      });
    });
    const scanResult = scanPrefixForExes(resolvedPrefix);
    if (scanResult.candidates.length > 0) {
      return returnOrSelect(shop, objectId, { wasOpened: true, ...scanResult }, effectiveGameTitle || "", downloadKey, prefixDriveCPath, existingExePath);
    }
  }

  /* fallback: retorna candidatos da pasta original */
  const folderExes = findExesInFolder(gamePath);
  if (folderExes.candidates.length > 0) {
    return returnOrSelect(shop, objectId, {
      wasOpened: true,
      candidates: folderExes.candidates,
      suggestedDir: folderExes.suggestedDir,
    }, effectiveGameTitle || "", downloadKey, prefixDriveCPath, existingExePath);
  }

  return { wasOpened: true, candidates: [], suggestedDir: gamePath };
};

registerEvent("openGameInstaller", openGameInstaller);
