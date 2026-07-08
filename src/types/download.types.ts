import type { Download } from "./store.types";

export type DownloadStatus =
  | "active"
  | "waiting"
  | "paused"
  | "error"
  | "complete"
  | "seeding"
  | "removed"
  | "extracting";

export interface DownloadProgress {
  downloadSpeed: number;
  timeRemaining: number;
  numPeers: number;
  numSeeds: number;
  isDownloadingMetadata: boolean;
  isCheckingFiles: boolean;
  progress: number;
  gameId: string;
  download: Download;
  batchFilesTotal?: number;
  batchFilesDownloaded?: number;
}

/* Torrent */
export interface SeedingStatus {
  gameId: string;
  status: DownloadStatus;
  uploadSpeed: number;
}
