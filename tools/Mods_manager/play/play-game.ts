import fs from "node:fs";
import path from "node:path";
import { ModStorageService, logger } from "@main/services";
import { getDeployFunction } from "@games/registry";
import { getStagingDir } from "@games/_shared/filemap";
import { detectGame, defaultPrefixDir } from "./steps/01-detect";
import { ensureProton } from "./steps/02-proton";
import { ensurePrefix } from "./steps/03-prefix";
import { applyGameConfigs } from "./steps/04-configs";
import { ensureSkse } from "./steps/05-skse";
import { launchGame } from "./steps/06-launch";
import type { SendProgress, PlayResult } from "./types";
import type { DetectResult } from "./steps/01-detect";
import { logPlay } from "./logger";

export async function playGame(
  gameId: string,
  send: SendProgress,
  profile?: string,
): Promise<PlayResult> {
  try {
    const usedProfile = profile || "Default";
    logPlay(gameId, "start", { profile: usedProfile });

    // ── Step 1: Detect ──
    const detect = await detectGame(gameId, send);
    if (!("gamePath" in detect)) return detect;

    const { gamePath, steamAppId, prefixPath, libraryPath } = detect as DetectResult;
    logPlay(gameId, "detect", {
      gamePath: gamePath || "",
      steamAppId: steamAppId || "",
      prefixPath: prefixPath || "",
      libraryPath: libraryPath || "",
    });

    // Determine effective prefix (Steam compatdata takes precedence over config path)
    let effectivePrefix = prefixPath;
    if (steamAppId && libraryPath) {
      const steamPfx = path.join(libraryPath, "compatdata", steamAppId, "pfx");
      if (fs.existsSync(steamPfx) && fs.existsSync(path.join(steamPfx, "drive_c"))) {
        effectivePrefix = steamPfx;
      }
    }
    logPlay(gameId, "prefix_effective", { effectivePrefix: effectivePrefix || "" });

    // ── Step 2: Proton ──
    const { protonPath, useCustomPrefix } = await ensureProton(gameId, send, effectivePrefix);
    logPlay(gameId, "proton", {
      protonPath: protonPath || "",
      useCustomPrefix: String(useCustomPrefix),
    });

    // ── Step 3: Prefix ──
    const finalPrefixPath = useCustomPrefix ? defaultPrefixDir(gameId) : prefixPath;
    const { prefixPath: resolvedPrefix } = await ensurePrefix(
      gameId, finalPrefixPath, protonPath, steamAppId, gamePath, libraryPath, send,
    );
    logPlay(gameId, "prefix_resolved", { resolvedPrefix: resolvedPrefix || "" });

    // ── Step 4: Configs (DLL overrides + winetricks + registry) ──
    await applyGameConfigs(gameId, gamePath, resolvedPrefix, protonPath, send, steamAppId, libraryPath);
    logPlay(gameId, "configs_applied", { resolvedPrefix, protonPath });

    // ── Step 5: SKSE (antes do deploy para o swap do launcher funcionar) ──
    const { hasSkse, sksePath } = await ensureSkse(gameId, gamePath, send);
    logPlay(gameId, "skse", { hasSkse: String(hasSkse), sksePath: sksePath || "" });

    // ── Step 6: Deploy mods ──
    send("deploy", "Implantando mods...", "working");
    try {
      const config = ModStorageService.get<any>(`game:${gameId}:config`);
      const stagingDir = config?.stagingDir || getStagingDir(gameId);
      const modlistKey = `game:${gameId}:profile:${usedProfile}:modlist`;
      const modlist = ModStorageService.get<any[]>(modlistKey) || [];
      const deployFn = getDeployFunction(gameId);
      const deployResult = await deployFn(
        gameId, gamePath, stagingDir, modlist, usedProfile, resolvedPrefix,
      );
      logPlay(gameId, "deploy", {
        stagingDir,
        modlistCount: String(modlist.length),
        success: String(deployResult.success),
      });
      if (!deployResult.success) {
        send("deploy", `Falha no deploy: ${deployResult.error || "erro desconhecido"}`, "error");
        return { success: false, error: deployResult.error || "Deploy failed" };
      }
      send("deploy", `Mods implantados (${deployResult.log?.length || 0} operações)`, "done");
    } catch (deployErr) {
      const msg = String(deployErr).slice(0, 150);
      send("deploy", msg, "error");
      throw new Error(`Falha no deploy: ${msg}`);
    }

    // ── Step 7: Launch ──
    const launchResult = await launchGame(
      gameId, gamePath, resolvedPrefix, steamAppId, libraryPath,
      hasSkse, sksePath, protonPath, send,
    );
    logPlay(gameId, "launch", {
      success: String(launchResult.success),
      method: launchResult.method || "",
    });

    return { success: launchResult.success, method: launchResult.method, gamePath };
  } catch (err) {
    const msg = String(err).slice(0, 200);
    logger.error(`playGame error: ${msg}`);
    logPlay(gameId, "error", { message: msg });
    send("error", `Erro interno: ${msg}`, "error");
    return { success: false, error: msg };
  }
}
