import { storeKeys } from "./keys";
import { db } from "../store";
import { logger } from "@main/services";

// Gets when we last started the app (for next API call's 'since')
export const getDownloadSourcesCheckBaseline = async (): Promise<
  string | null
> => {
  try {
    const timestamp = await db.get(storeKeys.downloadSourcesCheckBaseline, {
      valueEncoding: "utf8",
    });

    // Value was wrapped in quotes for some reason, remove them if they exist
    return timestamp.replaceAll('"', "");
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      logger.debug("Download sources check baseline not found, returning null");
    } else {
      logger.error(
        "Unexpected error while getting download sources check baseline",
        error
      );
    }
    return null;
  }
};

// Updates to current time (when app starts)
export const updateDownloadSourcesCheckBaseline = async (
  timestamp: string
): Promise<void> => {
  const utcTimestamp = new Date(timestamp).toISOString();
  await db.put(storeKeys.downloadSourcesCheckBaseline, utcTimestamp, {
    valueEncoding: "utf8",
  });
};

// Gets the 'since' value the API used in the last check (for modal comparison)
export const getDownloadSourcesSinceValue = async (): Promise<
  string | null
> => {
  try {
    const timestamp = await db.get(storeKeys.downloadSourcesSinceValue, {
      valueEncoding: "utf8",
    });
    return timestamp;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      logger.debug("Download sources since value not found, returning null");
    } else {
      logger.error(
        "Unexpected error while getting download sources since value",
        error
      );
    }
    return null;
  }
};

// Saves the 'since' value we used in the API call (for modal to compare against)
export const updateDownloadSourcesSinceValue = async (
  timestamp: string
): Promise<void> => {
  const utcTimestamp = new Date(timestamp).toISOString();
  await db.put(storeKeys.downloadSourcesSinceValue, utcTimestamp, {
    valueEncoding: "utf8",
  });
};
