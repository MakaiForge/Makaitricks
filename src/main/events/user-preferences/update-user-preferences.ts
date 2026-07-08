import { registerEvent } from "../register-event";

import type { UserPreferences } from "@types";
import i18next from "i18next";
import { db, storeKeys } from "@main/store";
import { DownloadManager } from "@main/services";

const updateUserPreferences = async (
  _event: Electron.IpcMainInvokeEvent,
  preferences: Partial<UserPreferences>
) => {
  let userPreferences: UserPreferences | null = null;
  try {
    userPreferences = await db.get<string, UserPreferences>(storeKeys.userPreferences);
  } catch {
    // Key doesn't exist yet, start with defaults
  }

  if (preferences.language) {
    await db.put(storeKeys.language, preferences.language);
    i18next.changeLanguage(preferences.language);
  }

  await db.put(storeKeys.userPreferences, {
    ...userPreferences,
    ...preferences,
  });

  if (Object.hasOwn(preferences, "maxDownloadSpeedBytesPerSecond")) {
    await DownloadManager.applyDownloadSpeedLimit(
      preferences.maxDownloadSpeedBytesPerSecond ?? null
    );
  }
};

registerEvent("updateUserPreferences", updateUserPreferences);
