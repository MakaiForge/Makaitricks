import { registerEvent } from "@main/events/register-event";
import { ModStorageService } from "@main/services";
import { ProtonForgeRPC } from "@main/services/protonforge-rpc";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LOG_FILE = path.join(os.homedir(), "Games", "Mods", "prepare-prefix.log");

function log(...args: unknown[]) {
  const ts = new Date().toLocaleString("pt-BR");
  const line = `[${ts}] ${args.map(a => String(a)).join(" ")}`;
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch { /* silent */ }
}

type ModGameConfig = {
  gamePath: string;
  stagingDir: string;
  protonPrefix: string;
  protonVersion?: string;
};

registerEvent("modCreatePrefix", async (_event, gameId: string) => {
  const config = ModStorageService.get<ModGameConfig | null>(`game:${gameId}:config`);
  if (!config) {
    log("modCreatePrefix", gameId, "FAIL", "jogo não configurado");
    return { ok: false, error: "Jogo não configurado. Detecte ou configure manualmente primeiro." };
  }

  const protonPath = config.protonVersion || "";
  if (!protonPath) {
    log("modCreatePrefix", gameId, "FAIL", "nenhum Proton configurado");
    return { ok: false, error: "Nenhum Proton configurado. Selecione um Proton primeiro." };
  }

  const prefixPath = config.protonPrefix || "";
  log("modCreatePrefix", `game=${gameId}`, `proton=${protonPath}`, `prefix=${prefixPath}`);

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

    const status = result.success ? "OK" : "FAIL";
    log("create_prefix", status, `prefix_path=${result.prefix_path}`, `initialized=${result.initialized}`, `errors=${JSON.stringify(result.errors)}`);

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
    log("create_prefix", "RPC_ERROR", String(err));
    return { ok: false, error: `Erro RPC: ${String(err)}` };
  }
});

registerEvent("modInstallGameDlls", async (_event, gameId: string, extraVerbs?: string[]) => {
  const config = ModStorageService.get<ModGameConfig | null>(`game:${gameId}:config`);
  if (!config) {
    return { ok: false, error: "Jogo não configurado." };
  }

  const protonPath = config.protonVersion || "";
  const prefixPath = config.protonPrefix || "";
  if (!protonPath || !prefixPath) {
    return { ok: false, error: "Proton e prefixo devem estar configurados." };
  }

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

    return {
      ok: true,
      data: {
        installed: result.installed || [],
        errors: result.errors || [],
      },
    };
  } catch (err) {
    return { ok: false, error: `Erro RPC: ${String(err)}` };
  }
});
