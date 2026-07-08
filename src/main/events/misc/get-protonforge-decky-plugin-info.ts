import { registerEvent } from "../register-event";
import { logger } from "../../services/logger";
import { ProtonForgeApi } from "../../services/protonforge-api";
import { FORGER_DECKY_PLUGIN_LOCATION } from "@main/constants";
import fs from "node:fs";
import path from "node:path";

interface DeckyReleaseInfo {
  version: string;
  downloadUrl: string;
}

const DECKY_PLUGIN_LOCATION = FORGER_DECKY_PLUGIN_LOCATION;

const getProtonForgeDeckyPluginInfo = async (
  _event: Electron.IpcMainInvokeEvent
): Promise<{
  installed: boolean;
  version: string | null;
  path: string;
  outdated: boolean;
  expectedVersion: string | null;
}> => {
  try {
    let expectedVersion: string | null = null;
    try {
      const releaseInfo = await ProtonForgeApi.get<DeckyReleaseInfo>(
        "/decky/release",
        {},
        { needsAuth: false }
      );
      expectedVersion = releaseInfo?.version ?? null;
    } catch (error) {
      logger.error("Failed to fetch Decky release info:", error);
    }

    if (!fs.existsSync(DECKY_PLUGIN_LOCATION)) {
      return {
        installed: false,
        version: null,
        path: DECKY_PLUGIN_LOCATION,
        outdated: true,
        expectedVersion,
      };
    }

    const packageJsonPath = path.join(DECKY_PLUGIN_LOCATION, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      logger.log("Makai Forge Decky plugin package.json not found");
      return {
        installed: false,
        version: null,
        path: DECKY_PLUGIN_LOCATION,
        outdated: true,
        expectedVersion,
      };
    }

    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    const version = packageJson.version;

    const outdated = expectedVersion ? version !== expectedVersion : false;

    logger.log(
      `Makai Forge Decky plugin installed, version: ${version}, expected: ${expectedVersion}, outdated: ${outdated}`
    );

    return {
      installed: true,
      version,
      path: DECKY_PLUGIN_LOCATION,
      outdated,
      expectedVersion,
    };
  } catch (error) {
    logger.error("Failed to get plugin info:", error);
    return {
      installed: false,
      version: null,
      path: DECKY_PLUGIN_LOCATION,
      outdated: true,
      expectedVersion: null,
    };
  }
};

registerEvent("getProtonForgeDeckyPluginInfo", getProtonForgeDeckyPluginInfo);
