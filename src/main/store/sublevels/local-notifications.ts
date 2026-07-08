import { SqliteStore } from "@main/services/sqlite-store";

export const localNotificationsStore = new SqliteStore("local_notifications");
