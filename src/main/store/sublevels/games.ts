import type { Game } from "@types";
import { gamesDb } from "../databases";

export const gamesStore = gamesDb as any;
