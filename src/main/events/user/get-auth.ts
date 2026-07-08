import { db, storeKeys } from "@main/store";
import type { Auth } from "@types";

import { registerEvent } from "../register-event";

const getAuth = async (_event: Electron.IpcMainInvokeEvent) =>
  db.get<string, Auth>(storeKeys.auth, {
    valueEncoding: "json",
  }).catch(() => null);

registerEvent("getAuth", getAuth);
