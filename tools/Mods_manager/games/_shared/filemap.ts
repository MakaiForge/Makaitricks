import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import type { ModlistEntry } from "@types";
import { SE_REGEXES } from "./bethesda-constants";

export const ROOT_PLUGIN_EXTS = new Set([".esp", ".esm", ".esl"]);

export function stripDataPrefix(relativePath: string): string {
  const parts = relativePath.split(path.sep);
  if (parts.length > 0 && parts[0].toLowerCase() === "data") {
    return parts.slice(1).join(path.sep);
  }
  return relativePath;
}

export interface WalkDirOptions {
  skipDotfiles?: boolean;
}

export function walkDir(
  dir: string,
  callback: (fullPath: string, relativePath: string) => void,
  options?: WalkDirOptions
): void {
  const walk = (currentDir: string, relativePrefix: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (options?.skipDotfiles && entry.name.startsWith(".")) continue;
      const fullPath = path.join(currentDir, entry.name);
      const rawRelative = relativePrefix
        ? path.join(relativePrefix, entry.name)
        : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, rawRelative);
      } else if (entry.isFile()) {
        callback(fullPath, rawRelative);
      }
    }
  };
  walk(dir, "");
}

export function walkDirWithDirs(
  dir: string,
  callbacks: {
    onFile: (fullPath: string, relativePath: string) => void;
    onDir?: (fullPath: string, relativePath: string, dirName: string) => void;
  },
  options?: WalkDirOptions
): void {
  const walk = (currentDir: string, relativePrefix: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (options?.skipDotfiles && entry.name.startsWith(".")) continue;
      const fullPath = path.join(currentDir, entry.name);
      const rawRelative = relativePrefix
        ? path.join(relativePrefix, entry.name)
        : entry.name;
      if (entry.isDirectory()) {
        callbacks.onDir?.(fullPath, rawRelative, entry.name);
        walk(fullPath, rawRelative);
      } else if (entry.isFile()) {
        callbacks.onFile(fullPath, rawRelative);
      }
    }
  };
  walk(dir, "");
}

export const STAGING_BASE = path.join(
  process.env.HOME || os.homedir(),
  ".local", "share", "protonforge", "mods", "staging"
);

export function getStagingDir(gameId: string): string {
  return path.join(STAGING_BASE, gameId);
}

export function findStagingDir(baseDir: string, modName: string): string | null {
  const candidate = path.join(baseDir, modName);
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

export function findPrefixUsername(prefixPath: string): string | null {
  const usersDir = path.join(prefixPath, "drive_c", "users");
  if (!fs.existsSync(usersDir)) return null;
  const skip = new Set(["public", "default", "all users", "default user"]);
  const dirs = fs.readdirSync(usersDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !skip.has(d.name.toLowerCase()))
    .map(d => d.name);
  if (dirs.length === 1) return dirs[0];

  const userReg = path.join(prefixPath, "user.reg");
  if (fs.existsSync(userReg)) {
    const text = fs.readFileSync(userReg, "utf-8");
    const m = text.match(/"AppData"=str\(2\):"C:\\\\users\\\\([^\\\\]+)\\\\/);
    if (m) return m[1];
  }
  return dirs[0] || null;
}

export async function buildFilemap(
  modlist: ModlistEntry[],
  stagingDir: string,
  _gamePath: string
): Promise<Record<string, string>> {
  const filemap: Record<string, string> = {};

  const enabledMods = modlist
    .filter((m) => m.enabled && !m.isSeparator)
    .map((m) => m.name);

  for (const modName of enabledMods) {
    const modStaging = findStagingDir(stagingDir, modName);
    if (!modStaging) continue;

    walkDir(modStaging, (fullPath, relativePath) => {
      filemap[relativePath] = fullPath;
    }, { skipDotfiles: true });
  }

  return filemap;
}

export async function buildPluginFilemap(
  modlist: ModlistEntry[],
  stagingDir: string,
  _gamePath: string
): Promise<Record<string, string>> {
  const filemap: Record<string, string> = {};

  const enabledMods = modlist
    .filter((m) => m.enabled && !m.isSeparator)
    .map((m) => m.name);

  for (const modName of enabledMods) {
    const modStaging = path.join(stagingDir, modName);
    if (!fs.existsSync(modStaging)) continue;

    walkDir(modStaging, (fullPath, relativePath) => {
      const parts = relativePath.split(path.sep);
      const isRoot = parts.length === 1;
      if (isRoot) {
        const fileName = parts[0];
        const ext = path.extname(fileName).toLowerCase();
        const isPlugin = ROOT_PLUGIN_EXTS.has(ext);
        const isSE = SE_REGEXES.some(p => p.test(fileName))
          && (ext === ".exe" || ext === ".dll");
        if (!isPlugin && !isSE) return;
      }
      const strippedPath = stripDataPrefix(relativePath);
      filemap[strippedPath] = fullPath;
    });
  }

  return filemap;
}
