import type { GameShop } from "@types";
import { gamesStore, storeKeys } from "@main/store";
import { launchGame } from "@main/helpers";
import { WindowManager } from "@main/services";
import { sendProgress } from "./send-progress";
import { ensureProtonAvailable } from "./ensure-proton";
import {
  handleExistingPrefix,
  createPrefixWithDlls,
} from "./handle-prefix";
import { downloadFromCatalog, promptManualInstaller } from "./download-installer";
import { handlePortableGame } from "./handle-portable";
import { executeInstaller } from "./execute-installer";
import fs from "node:fs";
import path from "node:path";

export async function openGame(
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  executablePath: string,
  launchOptions?: string | null
): Promise<void> {
  if (shop === "steam") {
    await launchGame({ shop, objectId, executablePath, launchOptions });
    return;
  }

  WindowManager.createGameLauncherWindow(shop, objectId);
  await new Promise((r) => setTimeout(r, 1500));

  const gameKey = storeKeys.game(shop, objectId);
  const game = await gamesStore.get(gameKey).catch(() => null);

  if (!game) {
    sendProgress("error", "Jogo não encontrado");
    return;
  }

  const needsRepair =
    !(executablePath && fs.existsSync(executablePath)) ||
    !(game.protonPath && fs.existsSync(path.join(game.protonPath, "proton"))) ||
    !(game.winePrefixPath && fs.existsSync(path.join(game.winePrefixPath, "drive_c")));

  if (!needsRepair) {
    sendProgress("complete", "Tudo ok. Iniciando...");
    await launchGame({ shop, objectId, executablePath, launchOptions });
    WindowManager.closeGameLauncherWindow();
    return;
  }

  sendProgress("checking", "Jogo corrompido. Iniciando reparo...");

  // 1. Garantir Proton
  const protonPathFinal = await ensureProtonAvailable(game, gameKey);
  if (!protonPathFinal) return;

  if (!game.winePrefixPath) {
    sendProgress("error", "Prefixo não configurado");
    return;
  }

  // 2. Lidar com prefixo
  const prefixHasDriveC = fs.existsSync(path.join(game.winePrefixPath, "drive_c"));

  if (prefixHasDriveC && game.executablePath && fs.existsSync(game.executablePath)) {
    sendProgress("complete", "Tudo ok. Iniciando...");
    await launchGame({ shop, objectId, executablePath: game.executablePath, launchOptions });
    WindowManager.closeGameLauncherWindow();
    return;
  }

  if (prefixHasDriveC) {
    await handleExistingPrefix(game.winePrefixPath, shop, objectId, game.title, gameKey);
    return;
  }

  const prefixCreated = await createPrefixWithDlls(objectId, protonPathFinal, game.winePrefixPath);
  if (!prefixCreated) return;

  // 3. Resolver fonte do instalador
  const hasCatalog = game.downloadSource === "catalog" && game.downloadUrl;

  let sourcePath: string | null = null;
  let isPortable = false;

  if (hasCatalog) {
    const result = await downloadFromCatalog(game, gameKey, shop, objectId);
    if (!result) return;
    sourcePath = result.sourcePath;
    isPortable = !result.isInstaller;
  } else {
    sourcePath = await promptManualInstaller();
    if (!sourcePath) return;
  }

  if (!fs.existsSync(sourcePath)) {
    sendProgress("error", "Instalador não encontrado");
    return;
  }

  // 4. Executar instalador ou copiar jogo portátil
  if (isPortable) {
    await handlePortableGame(sourcePath, game.winePrefixPath, shop, objectId, game.title, gameKey, game.executablePath);
  } else {
    await executeInstaller(sourcePath, objectId, game.winePrefixPath, protonPathFinal, game.title, gameKey, shop, game.executablePath);
  }
}
