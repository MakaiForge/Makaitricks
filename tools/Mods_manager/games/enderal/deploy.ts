import { deploySkyrimVariant, restoreSkyrimVariant } from "../skyrim";
import type { SkyrimConstants } from "../skyrim";
import { ENDERAL_CONSTANTS } from "./enderal.constants";

export const DEPLOY_CONSTANTS: SkyrimConstants = {
  exeName: ENDERAL_CONSTANTS.exeName,
  launcherName: ENDERAL_CONSTANTS.launcherName,
  skseLoaderName: ENDERAL_CONSTANTS.skseLoaderName,
  myGamesSubpath: ENDERAL_CONSTANTS.myGamesSubpath,
  appDataSubpath: ENDERAL_CONSTANTS.appDataSubpath,
};

export const deployGame = deploySkyrimVariant;
export const restoreGame = restoreSkyrimVariant;
export const getDeployConstants = () => DEPLOY_CONSTANTS;
