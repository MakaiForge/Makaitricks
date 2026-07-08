import fs from "node:fs";
import path from "node:path";
import type { GameModule } from "../_shared/types";
import { genericModule } from "../generic";
import { SATISFACTORY_CONSTANTS, SATISFACTORY_EXE_NAMES } from "./satisfactory.constants";

export function createSatisfactoryModule(): GameModule {
  const base = genericModule("satisfactory", "");
  return {
    ...base,
    id: "satisfactory",
    displayName: "Satisfactory",
    steamAppId: SATISFACTORY_CONSTANTS.steamAppId,
    altSteamAppIds: SATISFACTORY_CONSTANTS.altSteamAppIds,
    exeName: SATISFACTORY_CONSTANTS.exeName,
    preferredLaunchExe: SATISFACTORY_CONSTANTS.preferredLaunchExe,
    nexusDomain: SATISFACTORY_CONSTANTS.nexusDomain,
    aliases: [],
    detect: (gp) => SATISFACTORY_EXE_NAMES.some(e => fs.existsSync(path.join(gp, e))),
    getDeployTarget: (gp) => path.join(gp, SATISFACTORY_CONSTANTS.deployDir),
    getFrameworks: () => ({
      "SML": "SML/Bootstrap.dll",
    }),
  };
}
