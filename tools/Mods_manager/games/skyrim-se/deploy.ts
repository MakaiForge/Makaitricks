import { deploySkyrimVariant, restoreSkyrimVariant } from "../skyrim";
import type { SkyrimConstants } from "../skyrim";
import { SKYRIM_SE_CONSTANTS } from "./skyrim-se.constants";

export const DEPLOY_CONSTANTS: SkyrimConstants = {
  exeName: SKYRIM_SE_CONSTANTS.exeName,
  launcherName: SKYRIM_SE_CONSTANTS.launcherName,
  skseLoaderName: SKYRIM_SE_CONSTANTS.skseLoaderName,
  myGamesSubpath: SKYRIM_SE_CONSTANTS.myGamesSubpath,
  appDataSubpath: SKYRIM_SE_CONSTANTS.appDataSubpath,
};

export const deployGame = deploySkyrimVariant;
export const restoreGame = restoreSkyrimVariant;
export const getDeployConstants = () => DEPLOY_CONSTANTS;
