import { ipcMain } from "electron";
import { registerOpenFile } from "./open-file";
import { registerAnalyzeFile } from "./analyze-file";
import { registerInstallPackage } from "./install-package";
import { registerExtractIcon } from "./extract-icon";
import { registerCatalogSearch } from "./catalog-search";
import { registerProtonHandlers } from "./proton";
import { registerGameInstall } from "./game-install";
import { registerCloseApp } from "./close-app";
import { registerOpenProtonForger } from "./open-proton-forger";

export function registerCompatFlowEvents() {
  registerOpenFile(ipcMain);
  registerAnalyzeFile(ipcMain);
  registerInstallPackage(ipcMain);
  registerExtractIcon(ipcMain);
  registerCatalogSearch(ipcMain);
  registerProtonHandlers(ipcMain);
  registerGameInstall(ipcMain);
  registerCloseApp(ipcMain);
  registerOpenProtonForger(ipcMain);
}
