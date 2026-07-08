import fs from "node:fs";
import path from "node:path";
import type { GameModule } from "../_shared/types";
import { genericModule } from "../generic";
import { SUBNAUTICA_CONSTANTS, SUBNAUTICA_EXE_NAMES } from "./subnautica.constants";

export function createSubnauticaModule(): GameModule {
  const base = genericModule("subnautica", "");
  return {
    ...base,
    id: "subnautica",
    displayName: "Subnautica",
    steamAppId: SUBNAUTICA_CONSTANTS.steamAppId,
    altSteamAppIds: SUBNAUTICA_CONSTANTS.altSteamAppIds,
    exeName: SUBNAUTICA_CONSTANTS.exeName,
    preferredLaunchExe: SUBNAUTICA_CONSTANTS.preferredLaunchExe,
    nexusDomain: SUBNAUTICA_CONSTANTS.nexusDomain,
    aliases: [],
    detect: (gp) => SUBNAUTICA_EXE_NAMES.some(e => fs.existsSync(path.join(gp, e))),
    getDeployTarget: (gp) => path.join(gp, SUBNAUTICA_CONSTANTS.deployDir),
    getFrameworks: () => ({
      "BepInEx": "BepInEx/core/BepInEx.Preloader.dll",
    }),
  };
}
