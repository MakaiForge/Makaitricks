import type { DeploymentResult, ModlistEntry } from "@types";

export type LinkMode = "symlink" | "hardlink" | "copy";

export interface ScriptExtenderRelease {
  version: string
  url: string
  loaderName: string
  dllPattern: RegExp
}

export interface GameModule {
  id: string
  displayName?: string
  aliases: string[]
  steamAppId?: string
  altSteamAppIds?: readonly string[]
  nexusDomain?: string
  lootType?: string
  exeName?: string
  preferredLaunchExe?: string
  detect(gamePath: string): boolean
  getDeployTarget(gamePath: string): string
  shouldWritePluginsTxt(): boolean
  getPluginExtensions(): string[]
  onBeforeDeploy?(gamePath: string, stagingDir: string, modlist: ModlistEntry[]): void
  onAfterDeploy?(gamePath: string, stagingDir: string, modlist: ModlistEntry[], result: DeploymentResult): void
  deploy?(gamePath: string, stagingDir: string, modlist: ModlistEntry[],
          profile: string, prefixPath?: string, mode?: LinkMode): Promise<DeploymentResult>
  restore?(gamePath: string, stagingDir: string, profile: string,
           prefixPath?: string): Promise<void>
  getLaunchCommand?(): string[] | null
  /** Extra args appended to the launch command (e.g. "-windowed") */
  getLaunchArgs?(): string[]
  getLaunchEnv?(gamePath: string, prefixPath: string, protonPath?: string): Record<string, string>
  /** Retorna o executável correto para launch (prioridade sobre preferredLaunchExe) */
  getLaunchExe?(gamePath: string, hasSkse: boolean, sksePath?: string): string | null
  getWineDllOverrides?(): Record<string, string>
  getAutoInstallDeps?(): string[]
  getWinetricksComponents?(): string[]
  /** Semeia registro Bethesda via proton run reg add (cada jogo Bethesda implementa) */
  seedRegistry?(prefixPath: string, gamePath: string, protonPath: string, steamAppId?: string, libraryPath?: string): boolean
  /** Retorna o subpath para o diretório My Games (ex: "Skyrim", "Fallout4") */
  getMyGamesSubpath?(): string
  getCustomRoutingRules?(): CustomRule[]
  getFrameworks?(): Record<string, string>
  getArchiveInvalidationConfig?(): ArchiveInvalidationConfig | null
  getArchiveHandlers(): ArchiveHandler[]
  getScriptExtender(): ScriptExtenderDef | null
  /** Release info para download automático do script extender */
  getScriptExtenderRelease?(): ScriptExtenderRelease | null
  getExternalTools(): ExternalToolDef[]
}

export interface CustomRule {
  dest: string
  filenames?: string[]
  extensions?: readonly string[]
  folders?: string[]
  flatten?: boolean
  looseOnly?: boolean
  toPrefix?: boolean
  mirrorDests?: string[]
}

export interface ArchiveInvalidationConfig {
  enabled: boolean
  bsaName: string | null
  bsaVersion: number | null
  archiveListKey: string
  archiveListInPrefsIni: boolean
  needsModBsas: boolean
  modBsaExtensions: string[]
  invalidationIniKey: string
  customIniFilename?: string
  archiveListFixName?: string
  archiveListFixPath?: string
  iniFilename: string
  prefsIniFilename?: string
}

export interface ArchiveHandler {
  ext: string
  name: string
  extract(archivePath: string, targetDir: string): Promise<void>
  list(archivePath: string): Promise<string[]>
}

export interface ScriptExtenderDef {
  name: string
  pattern: RegExp
  installDir: string
  dllPattern?: RegExp
}

export interface ExternalToolDef {
  name: string
  exeName: string
  searchPaths: string[]
}
