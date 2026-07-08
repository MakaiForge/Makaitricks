export enum Downloader {
  Torrent,
  Gofile,
  PixelDrain,
  Datanodes,
  Mediafire,
  Nimbus,
  Buzzheavier,
  FuckingFast,
  VikingFile,
  Rootz,
  QBittorrent,
  Direct,
}

export enum DownloadSourceStatus {
  PendingMatching = "PENDING_MATCHING",
  Matched = "MATCHED",
  Matching = "MATCHING",
  Failed = "FAILED",
}

export enum CatalogueCategory {
  Hot = "hot",
  Weekly = "weekly",
}

export enum SteamContentDescriptor {
  SomeNudityOrSexualContent = 1,
  FrequenceViolenceOrGore = 2,
  AdultOnlySexualContent = 3,
  FrequentNudityOrSexualContent = 4,
  GeneralMatureContent = 5,
}

export enum Cracker {
  codex = "CODEX",
  rune = "RUNE",
  onlineFix = "OnlineFix",
  goldberg = "Goldberg",
  userstats = "user_stats",
  Steam = "Steam",
  rld = "RLD!",
  empress = "EMPRESS",
  skidrow = "SKIDROW",
  creamAPI = "CreamAPI",
  smartSteamEmu = "SmartSteamEmu",
  _3dm = "3dm",
  flt = "FLT",
  rle = "RLE",
  razor1911 = "RAZOR1911",
}

export enum AuthPage {
  SignIn = "/",
  UpdateEmail = "/update-email",
  UpdatePassword = "/update-password",
}

export enum DownloadError {
  GofileQuotaExceeded = "download_error_gofile_quota_exceeded",
  NotCached = "download_error_not_cached",
  NotCachedOnProtonForge = "download_error_not_cached_on_protonforge",
  VikingFileNimbusQuotaExceeded = "download_error_vikingfile_nimbus_quota_exceeded",
  InvalidMagnet = "download_error_invalid_magnet",
  TorrentMetadataTimeout = "download_error_torrent_metadata_timeout",
  TorrentMetadataIncomplete = "download_error_torrent_metadata_incomplete",
  TorrentNoFilesSelected = "download_error_torrent_no_files_selected",
  TorrentInvalidFileSelection = "download_error_torrent_invalid_file_selection",
  TorrentTooManyFiles = "download_error_torrent_too_many_files",
  TorrentFilesUnavailable = "download_error_torrent_files_unavailable",
}

export const FILE_EXTENSIONS_TO_EXTRACT = [".rar", ".zip", ".7z"];
