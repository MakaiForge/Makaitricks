import { defaultDownloadsPath } from "@main/constants";
import { db, storeKeys } from "@main/store";
import type { UserPreferences } from "@types";

export const getDownloadsPath = async () => {
  const userPreferences = await db.get<string, UserPreferences | null>(
    storeKeys.userPreferences,
    {
      valueEncoding: "json",
    }
  );

  if (userPreferences?.downloadsPath) return userPreferences.downloadsPath;

  return defaultDownloadsPath;
};
