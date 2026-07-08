import { storeKeys, gamesStore, db } from "@main/store";
import path from "node:path";
import * as tar from "tar";
import crypto from "node:crypto";
import fs from "node:fs";
import type { GameShop, User } from "@types";
import { backupsPath } from "@main/constants";
import { normalizePath, parseRegFile } from "@main/helpers";
import { logger } from "./logger";
import { WindowManager } from "./window-manager";
import { Ludusavi } from "./ludusavi";
import { formatDate, SubscriptionRequiredError } from "@shared";
import i18next, { t } from "i18next";
import { SystemPath } from "./system-path";
import { Wine } from "@provision/ForgePipeline/services/wine";

export class CloudSync {
  public static getWindowsLikeUserProfilePath(winePrefixPath?: string | null) {
    if (process.platform === "linux") {
      if (!winePrefixPath) {
        throw new Error("Wine prefix path is required");
      }

      const userReg = fs.readFileSync(
        path.join(winePrefixPath, "user.reg"),
        "utf8"
      );

      const entries = parseRegFile(userReg);
      const volatileEnvironment = entries.find(
        (entry) => entry.path === "Volatile Environment"
      );

      if (!volatileEnvironment) {
        throw new Error("Volatile environment not found in user.reg");
      }

      const { values } = volatileEnvironment;
      const userProfile = String(values["USERPROFILE"]);

      if (userProfile) {
        return normalizePath(userProfile);
      } else {
        throw new Error("User profile not found in user.reg");
      }
    }

    return normalizePath(SystemPath.getPath("home"));
  }

  public static getBackupLabel(automatic: boolean) {
    const language = i18next.language;

    const date = formatDate(new Date(), language);

    if (automatic) {
      return t("automatic_backup_from", {
        ns: "game_details",
        date,
      });
    }

    return t("backup_from", {
      ns: "game_details",
      date,
    });
  }

  private static async bundleBackup(
    shop: GameShop,
    objectId: string,
    winePrefix: string | null
  ) {
    const backupPath = path.join(backupsPath, `${shop}-${objectId}`);

    // Remove existing backup
    if (fs.existsSync(backupPath)) {
      try {
        await fs.promises.rm(backupPath, { recursive: true });
      } catch (error) {
        logger.error("Failed to remove backup path", { backupPath, error });
      }
    }

    await Ludusavi.backupGame(shop, objectId, backupPath, winePrefix);

    const tarLocation = path.join(backupsPath, `${crypto.randomUUID()}.tar`);

    await tar.create(
      {
        gzip: false,
        file: tarLocation,
        cwd: backupPath,
      },
      ["."]
    );

    return tarLocation;
  }

  public static async uploadSaveGame(
    objectId: string,
    shop: GameShop,
    _downloadOptionTitle: string | null,
    _label?: string
  ) {
    const hasActiveSubscription = await db
      .get<string, User>(storeKeys.user, { valueEncoding: "json" })
      .then((user) => {
        const expiresAt = new Date(user?.subscription?.expiresAt ?? 0);
        return expiresAt > new Date();
      });

    if (!hasActiveSubscription) {
      throw new SubscriptionRequiredError();
    }

    const game = await gamesStore.get(storeKeys.game(shop, objectId));
    const effectiveWinePrefixPath = Wine.getEffectivePrefixPath(
      game?.winePrefixPath,
      objectId
    );

    const bundleLocation = await this.bundleBackup(
      shop,
      objectId,
      effectiveWinePrefixPath
    );

    WindowManager.mainWindow?.webContents.send(
      `on-upload-complete-${objectId}-${shop}`,
      true
    );

    try {
      await fs.promises.unlink(bundleLocation);
    } catch (error) {
      logger.error("Failed to remove tar file", { bundleLocation, error });
    }
  }
}
