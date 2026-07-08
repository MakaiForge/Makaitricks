import path from "node:path";
import type { GameModule } from "../_shared/types";
import { genericModule } from "../generic";
import { MINECRAFT_CONSTANTS } from "./minecraft.constants";

export function createMinecraftModule(): GameModule {
  const base = genericModule("minecraft", "");
  return {
    ...base,
    id: "minecraft",
    displayName: "Minecraft (Java)",
    steamAppId: MINECRAFT_CONSTANTS.steamAppId,
    exeName: MINECRAFT_CONSTANTS.exeName,
    aliases: ["minecraft java"],
    detect: () => true,
    getDeployTarget: (gp) => path.join(gp, MINECRAFT_CONSTANTS.deployDir),
    getFrameworks: () => ({
      "Fabric Loader": "fabric-loader.jar",
      "Forge": "forge.jar",
      "NeoForge": "neoforge.jar",
    }),
    getPluginExtensions: () => [".jar"],
  };
}
