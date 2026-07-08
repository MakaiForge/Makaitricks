import path from "node:path";
import fs from "node:fs";
import type { GameModule, ScriptExtenderDef, ExternalToolDef } from "../_shared/types";
import { buildFilemap } from "../_shared/filemap";
import { scanSymlinks, symlinkAll, restoreSymlinks } from "../_shared/symlink";

export function genericModule(gameId: string, _gamePath: string): GameModule {
  return {
    id: gameId,
    aliases: [],
    detect(_gp: string) { return true; },
    getDeployTarget(gp: string) { return gp; },
    shouldWritePluginsTxt() { return false; },
    getPluginExtensions() { return []; },
    getScriptExtender(): ScriptExtenderDef | null { return null; },
    getArchiveHandlers() { return []; },
    getExternalTools(): ExternalToolDef[] { return []; },
  };
}

export async function deployGeneric(
  _gameId: string,
  gamePath: string,
  stagingDir: string,
  modlist: import("@types").ModlistEntry[]
): Promise<import("@types").DeploymentResult> {
  const log: string[] = [];
  const targetDir = gamePath;

  const filemap = await buildFilemap(modlist, stagingDir, gamePath);
  log.push(`Built filemap with ${Object.keys(filemap).length} entries`);

  const preExistingSymlinks = fs.existsSync(targetDir) ? scanSymlinks(targetDir) : {};
  log.push(`Saved manifest: ${Object.keys(preExistingSymlinks).length} pre-existing symlinks`);

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const count = symlinkAll(filemap, targetDir);
    log.push(`Created ${count} symlinks`);
    return { success: true, log, filemap };
  } catch (err) {
    log.push(`Deploy failed: ${String(err)}. Rolling back...`);
    for (const relativePath of Object.keys(filemap)) {
      const targetPath = path.join(targetDir, relativePath);
      try {
        if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isSymbolicLink()) {
          fs.unlinkSync(targetPath);
        }
      } catch { /* skip */ }
    }
    restoreSymlinks(preExistingSymlinks, targetDir);
    return { success: false, log, filemap: {} };
  }
}
