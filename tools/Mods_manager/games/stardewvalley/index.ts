import fs from "node:fs";
import path from "node:path";
import type { GameModule } from "../_shared/types";
import { genericModule } from "../generic";
import { STARDEW_CONSTANTS, STARDEW_EXE_NAMES } from "./stardewvalley.constants";

export function createStardewvalleyModule(): GameModule {
  const base = genericModule("stardewvalley", "");
  return {
    ...base,
    id: "stardewvalley",
    displayName: "Stardew Valley",
    steamAppId: STARDEW_CONSTANTS.steamAppId,
    altSteamAppIds: STARDEW_CONSTANTS.altSteamAppIds,
    exeName: STARDEW_CONSTANTS.exeName,
    preferredLaunchExe: STARDEW_CONSTANTS.preferredLaunchExe,
    nexusDomain: STARDEW_CONSTANTS.nexusDomain,
    aliases: [],
    detect: (gp) => STARDEW_EXE_NAMES.some(e => fs.existsSync(path.join(gp, e))),
    getDeployTarget: (gp) => path.join(gp, STARDEW_CONSTANTS.deployDir),
    getFrameworks: () => ({
      "SMAPI": "StardewModdingAPI.exe",
    }),
  };
}
