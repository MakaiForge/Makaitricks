import type { GameShop } from "@types";
import { WindowManager, GameLogManager } from "@main/services";
import { installAndScan } from "@provision/ForgePipeline/orchestrator/orchestrator";
import { sendProgress } from "./send-progress";
import { showExecutableSelect } from "./handle-prefix";
import { gamesStore } from "@main/store";
import path from "node:path";
import fs from "node:fs";

export async function executeInstaller(
  installerPath: string,
  objectId: string,
  winePrefixPath: string,
  protonPath: string,
  gameTitle: string,
  gameKey: string,
  shop: GameShop,
  existingExePath?: string | null
): Promise<void> {
  sendProgress("installing", "Execute o instalador e feche quando terminar.");
  const result = await installAndScan(installerPath, {
    gameId: objectId,
    winePrefixPath,
    protonPath,
    gameTitle,
    gameKey,
    shop,
    objectId,
    onLog: (line) => GameLogManager.append(shop, objectId, line),
  });

  WindowManager.closeGameLauncherWindow();

  if (existingExePath && fs.existsSync(existingExePath)) {
    const game = await gamesStore.get(gameKey).catch(() => null);
    if (game) {
      await gamesStore.put(gameKey, { ...game, executablePath: existingExePath });
    }
    sendProgress("complete", "Jogo restaurado com sucesso");
    return;
  }

  if (result.candidates.length > 0) {
    showExecutableSelect(
      result.candidates,
      result.suggestedDir,
      path.join(winePrefixPath, "drive_c"),
      gameTitle,
      gameKey,
      shop,
      objectId
    );
  } else {
    sendProgress("error", "Nenhum executável encontrado após instalação");
  }
}
