import fs from "node:fs";
import path from "node:path";
import { logger } from "@main/services";
import { registerEvent } from "@main/events/register-event";
import { getSteamLocation } from "@main/services/steam";
import { parseLibraryFolders, findProtonPath, findSteamClientPath } from "../core/steam-paths";
import { createPrefix } from "../core/init";
import { clearCompatData, ensureCompatData } from "../core/clear";

const clearSteamPrefix = async (
  event: Electron.IpcMainInvokeEvent,
  appId: string,
  protonName?: string,
): Promise<boolean> => {
  const sendProgress = (msg: string) => {
    try { event.sender.send("prefix-progress", appId, msg); } catch {}
  };

  const steamPath = await getSteamLocation().catch(() => {
    logger.error("[clearSteamPrefix] Steam not found");
    sendProgress("❌ Steam não encontrada");
    return null;
  });
  if (!steamPath) {
    logger.error(`[clearSteamPrefix] Aborting — no Steam path for appId=${appId}`);
    return false;
  }

  const libraryPaths = parseLibraryFolders(steamPath);
  logger.info(`[clearSteamPrefix] Library paths: ${libraryPaths.join(", ")}`);

  let compatDataPath: string | null = null;

  // Find existing compatdata directory
  for (const libPath of libraryPaths) {
    const compatDir = path.join(libPath, "compatdata", appId);
    if (fs.existsSync(compatDir)) {
      logger.info(`[clearSteamPrefix] Found compatdata at ${compatDir}`);
      sendProgress("🧹 Limpando prefixo antigo...");
      if (!clearCompatData(compatDir)) {
        logger.error(`[clearSteamPrefix] Failed to clear ${compatDir}`);
        sendProgress("❌ Erro ao limpar prefixo");
        return false;
      }
      compatDataPath = compatDir;
      break;
    }
  }

  // Create compatdata directory if it doesn't exist
  if (!compatDataPath) {
    logger.info(`[clearSteamPrefix] No existing compatdata for appId=${appId}, creating new`);
    for (const libPath of libraryPaths) {
      const candidate = path.join(libPath, "compatdata", appId);
      ensureCompatData(candidate);
      compatDataPath = candidate;
      break;
    }
    if (!compatDataPath) {
      logger.error(`[clearSteamPrefix] Could not create compatdata for appId=${appId}`);
      sendProgress("❌ Não foi possível criar diretório compatdata");
      return false;
    }
  }

  // Initialize prefix with Proton if a specific version was requested
  if (protonName) {
    logger.info(`[clearSteamPrefix] Recreating prefix with Proton "${protonName}"`);
    sendProgress(`🔧 Recriando prefixo com ${protonName}...`);

    const protonBinary = findProtonPath(protonName);
    if (!protonBinary) {
      logger.error(`[clearSteamPrefix] Proton "${protonName}" not found`);
      sendProgress(`❌ Proton "${protonName}" não encontrado`);
      return false;
    }

    const pfxDir = path.join(compatDataPath, "pfx");
    sendProgress("⚙ Executando wineboot...");
    const result = await createPrefix({
      protonPath: path.dirname(protonBinary),
      prefixPath: pfxDir,
      compatDataPath,
      steamClientPath: findSteamClientPath(),
      timeout: 120000,
      onProgress: (msg) => sendProgress(msg),
    });

    if (!result.success) {
      logger.error(`[clearSteamPrefix] Prefix creation failed: ${result.error}`);
      sendProgress(`❌ ${result.error || "Falha ao criar prefixo"}`);
      return false;
    }

    sendProgress(`✅ Prefixo recriado com ${protonName}`);
    return true;
  }

  logger.warn(`[clearSteamPrefix] No protonName provided — prefix cleared but NOT recreated for appId=${appId}`);
  sendProgress("⚠ Prefixo limpo, mas não recriado (sem Proton especificado)");
  return true;
};

registerEvent("clearSteamPrefix", clearSteamPrefix);
