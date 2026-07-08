import type { ArchiveInvalidationConfig } from "../_shared/types";

export function getInvalidationConfig(): ArchiveInvalidationConfig {
  return {
    enabled: true,
    bsaName: "SkyrimVR - Invalidation.bsa",
    bsaVersion: 0x68,
    archiveListKey: "SArchiveList",
    archiveListInPrefsIni: true,
    needsModBsas: false,
    modBsaExtensions: [".bsa"],
    invalidationIniKey: "bInvalidateOlderFiles",
    iniFilename: "Skyrim.ini",
    prefsIniFilename: "SkyrimPrefs.ini",
  };
}
