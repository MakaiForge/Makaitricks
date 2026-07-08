import type { ArchiveInvalidationConfig } from "../_shared/types";

export function getInvalidationConfig(): ArchiveInvalidationConfig {
  return {
    enabled: true,
    bsaName: "EnderalSE - Invalidation.bsa",
    bsaVersion: 0x68,
    archiveListKey: "SArchiveList",
    archiveListInPrefsIni: true,
    needsModBsas: false,
    modBsaExtensions: [".bsa"],
    invalidationIniKey: "bInvalidateOlderFiles",
    iniFilename: "EnderalSE.ini",
    prefsIniFilename: "EnderalSEPrefs.ini",
  };
}
