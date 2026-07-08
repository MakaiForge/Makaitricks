import type { Downloader } from "@shared";
import type { GameShop } from "./game.types";
import type { DownloadStatus } from "./download.types";

export type SubscriptionStatus = "active" | "pending" | "cancelled";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  plan: { id: string; name: string };
  expiresAt: string | null;
  paymentMethod: "pix" | "paypal";
}

export interface Auth {
  accessToken: string;
  refreshToken: string;
  tokenExpirationTimestamp: number;
}

export interface MakaiAuth {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    email?: string;
    is_admin: boolean;
  };
}

export interface MakaiNotification {
  id: number;
  type: "comment_reply" | "comment_like" | "follow";
  message: string;
  read: number;
  created_at: string;
}

export interface User {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  backgroundImageUrl: string | null;
  subscription: Subscription | null;
}

export interface Game {
  title: string;
  iconUrl: string | null;
  libraryHeroImageUrl: string | null;
  logoImageUrl: string | null;
  customIconUrl?: string | null;
  customLogoImageUrl?: string | null;
  customHeroImageUrl?: string | null;
  originalIconPath?: string | null;
  originalLogoPath?: string | null;
  originalHeroPath?: string | null;
  customOriginalIconPath?: string | null;
  customOriginalLogoPath?: string | null;
  customOriginalHeroPath?: string | null;
  playTimeInMilliseconds: number;
  unsyncedDeltaPlayTimeInMilliseconds?: number;
  lastTimePlayed: Date | null;
  objectId: string;
  shop: GameShop;
  remoteId: string | null;
  collectionIds?: string[];
  isDeleted: boolean;
  winePrefixPath?: string | null;
  protonPath?: string | null;
  protonVersion?: string | null;
  executablePath?: string | null;
  launchOptions?: string | null;
  enableEac?: boolean | null;
  enableBattlEye?: boolean | null;
  autoRunMangohud?: boolean | null;
  autoRunGamemode?: boolean | null;
  favorite?: boolean;
  isPinned?: boolean;
  pinnedDate?: Date | null;
  automaticCloudSync?: boolean;
  hasManuallyUpdatedPlaytime?: boolean;
  newDownloadOptionsCount?: number;
  installedSizeInBytes?: number | null;
  installerSizeInBytes?: number | null;
  steamShortcutAppId?: number;
  dxvk?: boolean | null;
  esync?: boolean | null;
  fsync?: boolean | null;
  dxvkVersion?: string | null;
  dxvkAsync?: boolean | null;
  esyncManual?: boolean | null;
  fsyncManual?: boolean | null;
  env?: Record<string, string>;
  downloadSource?: "catalog" | "local" | "compatflow" | null;
  downloadUrl?: string | null;
  downloader?: number | null;
}

export interface Download {
  shop: GameShop;
  objectId: string;
  uri: string;
  folderName: string | null;
  downloadPath: string;
  progress: number;
  downloader: Downloader;
  bytesDownloaded: number;
  fileSize: number | null;
  shouldSeed: boolean;
  status: DownloadStatus | null;
  queued: boolean;
  timestamp: number;
  extracting: boolean;
  automaticallyExtract: boolean;
  automaticallyDeleteArchiveFiles: boolean;
  fileIndices?: number[];
  selectedFilesSize?: number | null;
  qbHash?: string;
}

export interface UserPreferences {
  downloadsPath?: string | null;
  ggDealsApiKey?: string | null;
  language?: string;
  realDebridApiToken?: string | null;
  premiumizeApiToken?: string | null;
  allDebridApiToken?: string | null;
  torBoxApiToken?: string | null;
  preferQuitInsteadOfHiding?: boolean;
  runAtStartup?: boolean;
  startMinimized?: boolean;
  launchToLibraryPage?: boolean;

  disableNsfwAlert?: boolean;
  hideExplicitContent?: boolean;
  enableAutoInstall?: boolean;
  seedAfterDownloadComplete?: boolean;
  showDownloadSpeedInMegabits?: boolean;
  downloadNotificationsEnabled?: boolean;
  repackUpdatesNotificationsEnabled?: boolean;
  achievementNotificationsEnabled?: boolean;
  friendRequestNotificationsEnabled?: boolean;
  friendStartGameNotificationsEnabled?: boolean;
  showDownloadSpeedInMegabytes?: boolean;
  extractFilesByDefault?: boolean;
  deleteArchiveFilesAfterExtractionByDefault?: boolean;
  autoplayGameTrailers?: boolean;
  hideToTrayOnGameStart?: boolean;
  enableNewDownloadOptionsBadges?: boolean;
  createStartMenuShortcut?: boolean;
  maxDownloadSpeedBytesPerSecond?: number | null;
  defaultProtonPath?: string | null;
  autoRunMangohud?: boolean;
  autoRunGamemode?: boolean;
}

export interface ScreenState {
  x?: number;
  y?: number;
  height: number;
  width: number;
  isMaximized: boolean;
}
