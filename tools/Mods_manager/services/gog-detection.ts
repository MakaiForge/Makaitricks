import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface GogGameInfo {
  appTitle: string;
  installPath: string;
  executable: string;
}

function heroicConfigPath(): string | null {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".config", "heroic"),
    path.join(home, ".var", "app", "com.heroicgameslauncher.hgl", "config", "heroic"),
    path.join(home, "snap", "heroic", "common", ".config", "heroic"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function detectThroughHeroic(): GogGameInfo[] {
  const heroPath = heroicConfigPath();
  if (!heroPath) return [];

  const gogStore = path.join(heroPath, "gog_store", "installed.json");
  if (!fs.existsSync(gogStore)) return [];

  try {
    const raw = JSON.parse(fs.readFileSync(gogStore, "utf-8"));
    const games: GogGameInfo[] = [];
    for (const entry of Object.values(raw) as Record<string, unknown>[]) {
      const installPath = entry.install_path as string;
      const appTitle = (entry.app_title as string) || "";
      if (installPath && fs.existsSync(installPath)) {
        games.push({
          appTitle,
          installPath,
          executable: (entry.executable as string) || "",
        });
      }
    }
    return games;
  } catch {
    return [];
  }
}

function detectCommonPaths(gameId: string): string | null {
  const home = os.homedir();
  const candidatePaths = [
    path.join(home, "GOG Games", "Skyrim Special Edition"),
    path.join(home, "GOG Games", "Skyrim SE"),
    path.join(home, "GOG", "Skyrim Special Edition"),
    path.join(home, "Games", "Skyrim Special Edition"),
  ];
  for (const gp of candidatePaths) {
    if (fs.existsSync(path.join(gp, "SkyrimSELauncher.exe")) || fs.existsSync(path.join(gp, "skse64_loader.exe"))) {
      return gp;
    }
  }
  return null;
}

export function findGogGamePath(gameId: string, gameName?: string): { gamePath: string; source: "heroic" | "manual" } | null {
  const heroicGames = detectThroughHeroic();

  if (gameName) {
    const lowerName = gameName.toLowerCase();
    const keywords = lowerName.split(/[\s:]+/).filter(w => w.length > 3);

    for (const gog of heroicGames) {
      const title = gog.appTitle.toLowerCase();
      if (title.includes(lowerName) || keywords.some(k => title.includes(k))) {
        return { gamePath: gog.installPath, source: "heroic" };
      }
    }
  } else {
    for (const gog of heroicGames) {
      const title = gog.appTitle.toLowerCase();
      if (title.includes(gameId.replace(/_/g, " ").toLowerCase())) {
        return { gamePath: gog.installPath, source: "heroic" };
      }
    }
  }

  const commonPath = detectCommonPaths(gameId);
  if (commonPath) return { gamePath: commonPath, source: "manual" };

  return null;
}

export function isGogGame(gamePath: string): boolean {
  if (fs.existsSync(path.join(gamePath, "steam_api64.dll"))) return false;
  if (fs.existsSync(path.join(gamePath, "steam_api.dll"))) return false;
  try {
    const entries = fs.readdirSync(gamePath);
    if (entries.some(e => /^goggame-.+\.id$/.test(e))) return true;
  } catch {}
  return false;
}
