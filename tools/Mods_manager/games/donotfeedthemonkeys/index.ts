import type { GameModule } from "../_shared/types";
import { genericModule } from "../generic";
import { NFTM_CONSTANTS } from "./donotfeedthemonkeys.constants";

export function createDonotfeedthemonkeysModule(): GameModule {
  const base = genericModule("donotfeedthemonkeys", "");
  return {
    ...base,
    id: "donotfeedthemonkeys",
    displayName: "Do Not Feed the Monkeys",
    steamAppId: NFTM_CONSTANTS.steamAppId,
    altSteamAppIds: NFTM_CONSTANTS.altSteamAppIds,
    exeName: NFTM_CONSTANTS.exeName,
    nexusDomain: NFTM_CONSTANTS.nexusDomain,
    aliases: [],
    detect: () => true,
  };
}
