// tools/prefix — Centralized prefix management
// All Wine/Proton prefix operations consolidated into one module tree.

export type { PrefixOptions, PrefixResult, ScanFixResult } from "./types";

export {
  parseLibraryFolders,
  findAllSteamLibraries,
  findProtonPath,
  findSteamClientPath,
  findSteamAppPath,
  findCompatData,
} from "./core/steam-paths";

export {
  createPrefix,
  initPrefix,
  initPrefixViaUmu,
  checkAndCreateWinePrefix,
  ensureGamePrefix,
} from "./core/init";
export type { CreatePrefixOptions, CreatePrefixResult, EnsureGamePrefixOptions, EnsureGamePrefixResult } from "./core/init";

export {
  clearCompatData,
  ensureCompatData,
  deleteGamePrefix,
} from "./core/clear";

export {
  validatePrefix,
  ensurePrefixDir,
  type ValidationResult,
} from "./core/validate";

export {
  applyWineDllOverrides,
  applyGameDllOverrides,
  BETHESDA_COMMON_DLL_OVERRIDES,
  MODERN_DIRECTX_DEPS,
  type DllOverridesMap,
} from "./core/dll-overrides";

export { Wine } from "./core/wine-prefix";

export { getVenvPythonPath, getPrefixPythonDir } from "./core/venv";
