import type { GameShop } from "@types";
import { WindowManager } from "@main/services";
import { gamesStore } from "@main/store";
import { copyFolderToPrefix } from "@provision/ForgePipeline/orchestrator/prefix-copier";
import { scanPrefixForExes } from "@provision/ForgePipeline/orchestrator/prefix-scanner";
import { sendProgress } from "./send-progress";
import { showExecutableSelect } from "./handle-prefix";
import path from "node:path";
import fs from "node:fs";

export async function handlePortableGame(
  sourceDir: string,
  winePrefixPath: string,
  shop: GameShop,
  objectId: string,
  gameTitle: string,
  gameKey: string,
  existingExePath?: string | null
): Promise<boolean> {
  sendProgress("installing", "Copiando jogo para o prefixo...");
  await copyFolderToPrefix(sourceDir, winePrefixPath, (pct) => {
    WindowManager.gameLauncherWindow?.webContents.send("preflight-progress", {
      status: "installing",
      detail: `Copiando jogo para o prefixo... ${pct}%`,
    });
  });

  WindowManager.closeGameLauncherWindow();

  if (existingExePath && fs.existsSync(existingExePath)) {
    const game = await gamesStore.get(gameKey).catch(() => null);
    if (game) {
      await gamesStore.put(gameKey, { ...game, executablePath: existingExePath });
    }
    sendProgress("complete", "Jogo restaurado com sucesso");
    try { fs.rmSync(sourceDir, { recursive: true, force: true }); } catch { }
    return true;
  }

  sendProgress("installing", "Procurando executáveis...");
  const scanResult = scanPrefixForExes(winePrefixPath);

  if (scanResult.candidates.length > 0) {
    showExecutableSelect(
      scanResult.candidates,
      scanResult.suggestedDir,
      path.join(winePrefixPath, "drive_c"),
      gameTitle,
      gameKey,
      shop,
      objectId
    );
  } else {
    sendProgress("error", "Nenhum executável encontrado no prefixo");
  }

  try { fs.rmSync(sourceDir, { recursive: true, force: true }); } catch { }
  return true;
}
