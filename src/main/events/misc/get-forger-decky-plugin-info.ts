import { registerEvent } from "../register-event";
import { logger } from "../../services/logger";
import { FORGER_DECKY_PLUGIN_LOCATION } from "@main/constants";
import fs from "node:fs";
import path from "node:path";

const getForgerDeckyPluginInfo = async (
  _event: Electron.IpcMainInvokeEvent
): Promise<{
  installed: boolean;
  version: string | null;
  path: string;
  outdated: boolean;
  expectedVersion: string | null;
}> => {
  try {
    if (!fs.existsSync(FORGER_DECKY_PLUGIN_LOCATION)) {
      return {
        installed: false,
        version: null,
        path: FORGER_DECKY_PLUGIN_LOCATION,
        outdated: true,
        expectedVersion: null,
      };
    }

    const packageJsonPath = path.join(
      FORGER_DECKY_PLUGIN_LOCATION,
      "package.json"
    );

    if (!fs.existsSync(packageJsonPath)) {
      logger.log("Makai Forge Decky plugin package.json not found");
      return {
        installed: false,
        version: null,
        path: FORGER_DECKY_PLUGIN_LOCATION,
        outdated: true,
        expectedVersion: null,
      };
    }

    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    const version = packageJson.version;

    logger.log(
      `Makai Forge Decky plugin installed, version: ${version}`
    );

    return {
      installed: true,
      version,
      path: FORGER_DECKY_PLUGIN_LOCATION,
      outdated: false,
      expectedVersion: null,
    };
  } catch (error) {
    logger.error("Failed to get plugin info:", error);
    return {
      installed: false,
      version: null,
      path: FORGER_DECKY_PLUGIN_LOCATION,
      outdated: true,
      expectedVersion: null,
    };
  }
};

registerEvent("getForgerDeckyPluginInfo", getForgerDeckyPluginInfo);
