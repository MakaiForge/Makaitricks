import path from "node:path";
import type { DeploymentResult, ModlistEntry } from "@types";
import { buildFilemap } from "../_shared/filemap";
import { scanSymlinks, symlinkAll, restoreSymlinks } from "../_shared/symlink";
import fs from "node:fs";

export function getDeployTarget(gamePath: string): string {
  return path.join(gamePath, "GameData");
}

export async function deployMods(_gameId: string, gamePath: string, stagingDir: string, modlist: ModlistEntry[]): Promise<DeploymentResult> {
  const targetDir = getDeployTarget(gamePath);
  const filemap = await buildFilemap(modlist, stagingDir, gamePath);
  const preExistingSymlinks = fs.existsSync(targetDir) ? scanSymlinks(targetDir) : {};
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const count = symlinkAll(filemap, targetDir);
    return { success: true, log: [`Created ${count} symlinks in deploy target`], filemap };
  } catch (err) {
    for (const relPath of Object.keys(filemap)) {
      const target = path.join(targetDir, relPath);
      try { if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) fs.unlinkSync(target); } catch {}
    }
    restoreSymlinks(preExistingSymlinks, targetDir);
    return { success: false, log: [`Deploy failed: ${String(err)}`], filemap: {} };
  }
}
