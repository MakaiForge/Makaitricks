import { app } from "electron";
import axios from "axios";
import { registerEvent } from "../register-event";
import { checkKeySequence } from "@main/supplemental";
import { getSupplementalData, getSupplementalMapSize } from "@main/services/supplemental-content";
import { db } from "@main/store";

const SITE_URL = app.isPackaged ? "https://makai-forge.store" : "http://localhost:8788";
const DB_KEY = "supplementalUnlock";

let unlockState = false;

async function loadState() {
  const saved = await db.get<boolean>(DB_KEY).catch(() => null);
  if (saved) unlockState = true;
}

async function persistUnlock() {
  unlockState = true;
  await db.put(DB_KEY, true).catch(() => {});
}

async function callSiteApi() {
  try {
    const auth = await db.get<string>("auth").catch(() => null);
    if (!auth) return;
    const parsed = JSON.parse(auth as string);
    const token = parsed.accessToken || parsed.token;
    if (!token) return;

    await axios.post(
      `${SITE_URL}/api/achievements/hackerman`,
      { hash: "eb7d4039ce7059a671caefef055f603659cbb62bd8f3a9227c0f39ec6f9a478a" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {}
}

loadState();

registerEvent("supplemental:check", async (_event, keys: number[]) => {
  if (unlockState) return { unlocked: true };
  if (!checkKeySequence(keys)) return { unlocked: false };

  await persistUnlock();
  callSiteApi();
  return { unlocked: true };
});

registerEvent("supplemental:status", async () => {
  return { unlocked: unlockState };
});

registerEvent("supplemental:getGameData", async (_event, shop: string, objectId: string) => {
  console.log("[supplemental] getGameData called:", shop, objectId, "unlockState:", unlockState);
  if (!unlockState) {
    console.log("[supplemental] blocked by unlockState");
    return null;
  }
  const data = getSupplementalData(shop, objectId);
  console.log("[supplemental] getSupplementalData result:", data ? { hasSources: data.downloadSources.length, hasDownloads: data.downloads.length } : null);
  return data;
});

registerEvent("supplemental:getGameDataBatch", async (_event, entries: { shop: string; objectId: string }[]) => {
  if (!unlockState) return null;

  const result: Map<string, { downloadSources: string[]; downloads: any[] }> = new Map();
  for (const { shop, objectId } of entries) {
    const data = getSupplementalData(shop, objectId);
    if (data) {
      const hasSources = data.downloadSources.length > 0;
      const hasDownloads = data.downloads.length > 0;
      if (hasSources || hasDownloads) {
        result.set(`${shop}:${objectId}`, data);
      }
    }
  }
  return Object.fromEntries(result);
});

registerEvent("supplemental:debug", async () => {
  const saved = await db.get<boolean>(DB_KEY).catch(() => null);
  return {
    unlockState,
    dbValue: saved,
    mapSize: getSupplementalMapSize(),
    totalGames: 201767,
  };
});

export function resetSupplemental(): void {
  unlockState = false;
}
