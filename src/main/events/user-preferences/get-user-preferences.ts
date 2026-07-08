import { registerEvent } from "../register-event";
import { db, storeKeys } from "@main/store";
import type { UserPreferences } from "@types";

const getUserPreferences = async (): Promise<UserPreferences | null> => {
  try {
    return await db.get<string, UserPreferences>(storeKeys.userPreferences, {
      valueEncoding: "json",
    });
  } catch {
    return null;
  }
};

registerEvent("getUserPreferences", getUserPreferences);
