import path from "node:path";
import fs from "node:fs";

export function removeSymlinksRecursive(dir: string): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch { return; }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeSymlinksRecursive(fullPath);
      try {
        const remaining = fs.readdirSync(fullPath);
        if (remaining.length === 0) fs.rmdirSync(fullPath);
      } catch { /* skip */ }
    } else if (entry.isSymbolicLink()) {
      try { fs.unlinkSync(fullPath); } catch { /* skip */ }
    }
  }
}

export function scanSymlinks(dir: string): Record<string, string> {
  const symlinks: Record<string, string> = {};
  const scan = (currentDir: string, relativePrefix: string = "") => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        scan(fullPath, relPath);
      } else if (entry.isSymbolicLink()) {
        symlinks[relPath] = fs.readlinkSync(fullPath);
      }
    }
  };
  scan(dir);
  return symlinks;
}

export function createSymlink(source: string, target: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch { /* skip */ }
  fs.symlinkSync(source, target);
}

export function removeSymlink(target: string): void {
  try {
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
      fs.unlinkSync(target);
    }
  } catch { /* skip */ }
}

export function symlinkAll(filemap: Record<string, string>, targetBaseDir: string): number {
  // Remove all existing symlinks before creating new ones, so stale
  // symlinks from a previous deploy (different mod order, renamed files, etc.)
  // don't accumulate in Data/.
  removeSymlinksRecursive(targetBaseDir);

  let count = 0;
  for (const [relativePath, sourcePath] of Object.entries(filemap)) {
    const targetPath = path.join(targetBaseDir, relativePath);
    createSymlink(sourcePath, targetPath);
    count++;
  }
  return count;
}

export function restoreSymlinks(manifest: Record<string, string>, targetBaseDir: string): void {
  for (const [relPath, linkTarget] of Object.entries(manifest)) {
    const targetPath = path.join(targetBaseDir, relPath);
    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.symlinkSync(linkTarget, targetPath);
    } catch { /* skip */ }
  }
}
