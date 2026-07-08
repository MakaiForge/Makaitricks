import { registerEvent } from "@main/events/register-event";
import { ModStorageService } from "@main/services";
import { ProtonForgeRPC } from "@main/services/protonforge-rpc";

// Eager spawn: server.py roda no startup e grava log.txt
ProtonForgeRPC.init();

type ModGameConfig = {
  gamePath: string;
  stagingDir: string;
  protonPrefix: string;
  protonVersion?: string;
};

registerEvent("modCreatePrefix", async (_event, gameId: string) => {
  const config = ModStorageService.get<ModGameConfig | null>(`game:${gameId}:config`);
  if (!config) {
    return { ok: false, error: "Jogo não configurado. Detecte ou configure manualmente primeiro." };
  }

  const protonPath = config.protonVersion || "";
  if (!protonPath) {
    return { ok: false, error: "Nenhum Proton configurado. Selecione um Proton primeiro." };
  }

  const prefixPath = config.protonPrefix || "";

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
