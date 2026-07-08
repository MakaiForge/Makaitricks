import { ProtonApi, logger } from "../";
import { downloadSourcesStore } from "@main/store";
import type { DownloadSource } from "@types";

export const syncDownloadSourcesFromApi = async () => {
  if (!ProtonApi.isLoggedIn() || !ProtonApi.hasActiveSubscription()) {
    return;
  }

  try {
    const profileSources = await ProtonApi.get<DownloadSource[]>(
      "/profile/download-sources"
    );

    if (!profileSources) return;

    const existingSources = await downloadSourcesStore.values().all();
    const existingUrls = new Set(existingSources.map((source) => source.url));

    for (const downloadSource of profileSources) {
      if (!existingUrls.has(downloadSource.url)) {
        try {
          await downloadSourcesStore.put(downloadSource.id, {
            ...downloadSource,
            isRemote: true,
            createdAt: new Date().toISOString(),
          });

          logger.log(
            `Synced download source from profile: ${downloadSource.url}`
          );
        } catch (error) {
          logger.error(
            `Failed to sync download source ${downloadSource.url}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    logger.error("Failed to sync download sources from API:", error);
  }
};
