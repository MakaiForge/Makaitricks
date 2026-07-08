// Re-export from centralized prefix module
export {
  applyWineDllOverrides,
  BETHESDA_COMMON_DLL_OVERRIDES,
  MODERN_DIRECTX_DEPS,
  type DllOverridesMap,
} from "@prefix/core/dll-overrides";

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findSteamClientPath } from "@prefix/core/steam-paths";

function buildProtonEnv(
  prefixPath: string,
  gamePath: string,
  steamAppId?: string,
  libraryPath?: string,
): Record<string, string> {
  const env: Record<string, string> = {
    ...process.env,
    WINEPREFIX: prefixPath,
  };

  let compatData: string | null = null;
  if (libraryPath && steamAppId) {
    compatData = path.join(libraryPath, "compatdata", steamAppId);
  } else if (path.basename(prefixPath) === "pfx") {
    compatData = path.dirname(prefixPath);
  } else {
    compatData = prefixPath;
  }

  if (compatData) env.STEAM_COMPAT_DATA_PATH = compatData;
  if (gamePath) env.STEAM_COMPAT_INSTALL_PATH = gamePath;
  env.STEAM_COMPAT_CLIENT_INSTALL_PATH = findSteamClientPath();

  if (steamAppId) {
    env.SteamAppId = steamAppId;
    env.SteamGameId = steamAppId;
    env.GAMEID = steamAppId;
  }

  return env;
}

/**
 * Semeia o registro Bethesda via `proton run reg add` com as env vars
 * necessárias para o GE-Proton funcionar (STEAM_COMPAT_DATA_PATH etc.).
 */
export function seedBethesdaRegistryWithProton(
  prefixPath: string,
  gamePath: string,
  protonPath: string,
  registryName: string,
  steamAppId?: string,
  libraryPath?: string,
): boolean {
  const winePath = "Z:" + gamePath.replace(/\//g, "\\");
  const key = `HKLM\\Software\\Bethesda Softworks\\${registryName}`;
  const key32 = `HKLM\\Software\\Wow6432Node\\Bethesda Softworks\\${registryName}`;
  const marker = path.join(prefixPath, ".bethesda_registry_seeded");

  if (fs.existsSync(marker)) {
    console.log(`Registro Bethesda (${registryName}) já configurado (marcador)`);
    return true;
  }

  const env = buildProtonEnv(prefixPath, gamePath, steamAppId, libraryPath);
  console.log(`Configurando registro Bethesda: ${key} = ${winePath}`);

  try { spawnSync("pkill", ["-9", "wineserver"], { stdio: "pipe" }); } catch {}
  try { spawnSync("killall", ["-9", "wineserver"], { stdio: "pipe" }); } catch {}

  for (const k of [key, key32]) {
    const result = spawnSync(
      path.join(protonPath, "proton"),
      ["run", "reg", "add", k, "/v", "Installed Path", "/t", "REG_SZ", "/d", `"${winePath}"`, "/f"],
      { env, stdio: "pipe", timeout: 30000 },
    );
    if (result.status !== 0) {
      const stdout = result.stdout?.toString() || "";
      const stderr = result.stderr?.toString() || "";
      console.error(`Falha ao adicionar registro: ${k}`, `status=${result.status}`, `stdout=${stdout}`, `stderr=${stderr}`);
      return false;
    }
    console.log(`Registro adicionado com sucesso: ${k}`);
  }

  try { fs.writeFileSync(marker, ""); } catch {}
  console.log(`Marcador de registro criado para ${registryName}`);
  return true;
}
