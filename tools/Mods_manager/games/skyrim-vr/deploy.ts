import { deploySkyrimVariant, restoreSkyrimVariant } from "../skyrim";
import type { SkyrimConstants } from "../skyrim";
import { SKYRIM_VR_CONSTANTS } from "./skyrim-vr.constants";

export const DEPLOY_CONSTANTS: SkyrimConstants = {
  exeName: SKYRIM_VR_CONSTANTS.exeName,
  launcherName: SKYRIM_VR_CONSTANTS.launcherName,
  skseLoaderName: SKYRIM_VR_CONSTANTS.skseLoaderName,
  myGamesSubpath: SKYRIM_VR_CONSTANTS.myGamesSubpath,
  appDataSubpath: SKYRIM_VR_CONSTANTS.appDataSubpath,
};

export const deployGame = deploySkyrimVariant;
export const restoreGame = restoreSkyrimVariant;
export const getDeployConstants = () => DEPLOY_CONSTANTS;
