import { statsDb } from "../databases";

interface GameStatsCached {
  downloadCount: number;
  playerCount: number;
  averageScore: number | null;
  reviewCount: number;
  updatedAt: number;
}

export const gamesStatsCacheStore = statsDb as any;
