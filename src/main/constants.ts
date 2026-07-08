import { app } from "electron";
import path from "node:path";
import { SystemPath } from "./services/system-path";

export const defaultDownloadsPath = SystemPath.getPath("downloads");

export const isStaging = import.meta.env.MAIN_VITE_API_URL.includes("staging");

export const windowsStartMenuPath = path.join(
  SystemPath.getPath("appData"),
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs"
);

export const publicProfilePath = "C:/Users/Public";

export const databasePath = path.join(
  SystemPath.getPath("userData"),
  `protonforge-db${isStaging ? "-staging" : ""}`
);

export const commonRedistPath = path.join(
  SystemPath.getPath("userData"),
  "CommonRedist"
);

export const logsPath = path.join(
  SystemPath.getPath("userData"),
  `logs${isStaging ? "-staging" : ""}`
);

export const backupsPath = path.join(SystemPath.getPath("userData"), "Backups");

export const appVersion = app.getVersion() + (isStaging ? "-staging" : "");

export const ASSETS_PATH = path.join(SystemPath.getPath("userData"), "Assets");

export const THEMES_PATH = path.join(SystemPath.getPath("userData"), "themes");

export const INTERVALS = {
  processWatcher: 2_000,
  downloadWatcher: 2_000,
  seedStatusWatcher: 2_000,
  updateChecker: 60_000 * 50, // 50 minutes
  powerSaveBlockerSync: 20_000,
};

export const DECKY_PLUGINS_LOCATION = path.join(
  SystemPath.getPath("home"),
  "homebrew",
  "plugins"
);

export const FORGER_DECKY_PLUGIN_LOCATION = path.join(
  DECKY_PLUGINS_LOCATION,
  "Makai Forge"
);
