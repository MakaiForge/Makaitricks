import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { registerEvent } from "@main/events/register-event";
import { ModStorageService } from "@main/services";
import { ProtonForgeRPC } from "@main/services/protonforge-rpc";
import { logPlay } from "@mods/play/logger";

// Eager spawn: server.py roda no startup e grava log.txt
ProtonForgeRPC.init();

type ModGameConfig = {
  gamePath: string;
  stagingDir: string;
  protonPrefix: string;
  protonVersion?: string;
};

/** Procura qualquer Proton instalado no sistema. */
function findAnyProton(): string | null {
  // 1. Steam common/Proton*
  const steamRoots = [
    path.join(os.homedir(), ".local", "share", "Steam"),
    path.join(os.homedir(), ".steam", "steam"),
    "/usr/share/steam",
  ];
  for (const root of steamRoots) {
    const commonDir = path.join(root, "steamapps", "common");
    if (!fs.existsSync(commonDir)) continue;
    try {
      for (const entry of fs.readdirSync(commonDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith("Proton") || entry.name.startsWith("proton")) {
          const protonDir = path.join(commonDir, entry.name);
          if (fs.existsSync(path.join(protonDir, "proton"))) return protonDir;
        }
      }
    } catch { continue; }
  }

  // 2. compatibilitytools.d
  const compatDirs = [
    path.join(os.homedir(), ".steam", "steam", "compatibilitytools.d"),
    "/usr/share/steam/compatibilitytools.d",
  ];
  for (const compatDir of compatDirs) {
    if (!fs.existsSync(compatDir)) continue;
    try {
      for (const entry of fs.readdirSync(compatDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const protonBin = path.join(compatDir, entry.name, "proton");
        if (fs.existsSync(protonBin)) return path.dirname(protonBin);
      }
    } catch { continue; }
  }

  return null;
}

registerEvent("modCreatePrefix", async (_event, gameId: string) => {
  const config = ModStorageService.get<ModGameConfig | null>(`game:${gameId}:config`);
  if (!config) {
    logPlay(gameId, "modCreatePrefix", { error: "jogo_nao_configurado" });
    return { ok: false, error: "Jogo não configurado. Detecte ou configure manualmente primeiro." };
  }

  let protonPath = config.protonVersion || "";

  // Se não tem Proton configurado, auto-detecta
  if (!protonPath) {
    logPlay(gameId, "modCreatePrefix", { status: "auto-detectando_proton" });
    const found = findAnyProton();
    if (found) {
      protonPath = found;
      // Salva no config pra não precisar detectar de novo
      ModStorageService.put(`game:${gameId}:config`, { ...config, protonVersion: protonPath });
      logPlay(gameId, "modCreatePrefix", { status: "proton_detectado", protonPath });
    } else {
      logPlay(gameId, "modCreatePrefix", { error: "nenhum_proton_encontrado" });
      return { ok: false, error: "Nenhum Proton encontrado no sistema. Instale um Proton pelo Steam primeiro." };
    }
  }

  const prefixPath = config.protonPrefix || "";
  logPlay(gameId, "modCreatePrefix", { protonPath, prefixPath, gamePath: config.gamePath });

  try {
    const result = await ProtonForgeRPC.call<{
      success: boolean;
      prefix_path: string;
      initialized: boolean;
      dlls_installed: string[];
      errors: string[];
    }>("create_prefix", {
      game_id: gameId,
      proton_path: protonPath,
      prefix_path: prefixPath,
      auto_dlls: true,
    });

    logPlay(gameId, "modCreatePrefix_result", {
      success: String(result.success),
      prefix_path: result.prefix_path,
      initialized: String(result.initialized),
      dlls: (result.dlls_installed || []).join(","),
      errors: (result.errors || []).join(","),
    });

    return {
      ok: result.success,
      data: {
        prefixPath: result.prefix_path,
        initialized: result.initialized,
        dllsInstalled: result.dlls_installed,
        errors: result.errors,
      },
      error: result.success ? undefined : (result.errors?.[0] || "Falha ao criar prefixo"),
    };
  } catch (err) {
    logPlay(gameId, "modCreatePrefix", { error: String(err).slice(0, 200) });
    return { ok: false, error: `Erro RPC: ${String(err)}` };
  }
});

registerEvent("modInstallGameDlls", async (_event, gameId: string, extraVerbs?: string[]) => {
  const config = ModStorageService.get<ModGameConfig | null>(`game:${gameId}:config`);
  if (!config) {
    logPlay(gameId, "modInstallGameDlls", { error: "jogo_nao_configurado" });
    return { ok: false, error: "Jogo não configurado." };
  }

  const protonPath = config.protonVersion || "";
  const prefixPath = config.protonPrefix || "";
  if (!protonPath || !prefixPath) {
    logPlay(gameId, "modInstallGameDlls", { error: "proton_ou_prefixo_faltando" });
    return { ok: false, error: "Proton e prefixo devem estar configurados." };
  }

  logPlay(gameId, "modInstallGameDlls", { protonPath, prefixPath, extraVerbs: (extraVerbs || []).join(",") });

  try {
    const result = await ProtonForgeRPC.call<{
      installed: string[];
      errors: string[];
    }>("install_game_dlls", {
      game_id: gameId,
      prefix_path: prefixPath,
      proton_path: protonPath,
      extra_verbs: extraVerbs,
    });

    logPlay(gameId, "modInstallGameDlls_result", {
      installed: (result.installed || []).join(","),
      errors: (result.errors || []).join(","),
    });

    return {
      ok: true,
      data: {
        installed: result.installed || [],
        errors: result.errors || [],
      },
    };
  } catch (err) {
    logPlay(gameId, "modInstallGameDlls", { error: String(err).slice(0, 200) });
    return { ok: false, error: `Erro RPC: ${String(err)}` };
  }
});
