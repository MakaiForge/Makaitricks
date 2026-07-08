import { deploySkyrimVariant, restoreSkyrimVariant } from "../skyrim";
import type { SkyrimConstants } from "../skyrim";
import { ENDERAL_SE_CONSTANTS } from "./enderal-se.constants";

export const DEPLOY_CONSTANTS: SkyrimConstants = {
  exeName: ENDERAL_SE_CONSTANTS.exeName,
  launcherName: ENDERAL_SE_CONSTANTS.launcherName,
  skseLoaderName: ENDERAL_SE_CONSTANTS.skseLoaderName,
  myGamesSubpath: ENDERAL_SE_CONSTANTS.myGamesSubpath,
  appDataSubpath: ENDERAL_SE_CONSTANTS.appDataSubpath,
};

export const deployGame = deploySkyrimVariant;
export const restoreGame = restoreSkyrimVariant;
export const getDeployConstants = () => DEPLOY_CONSTANTS;
