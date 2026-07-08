import jwt from "jsonwebtoken";

import { registerEvent } from "../register-event";
import { db, storeKeys } from "@main/store";
import type { Auth } from "@types";

const getSessionHash = async (_event: Electron.IpcMainInvokeEvent) => {
  try {
    const auth = await db.get<string, Auth>(storeKeys.auth, {
      valueEncoding: "json",
    });

    if (!auth) return null;
    const payload = jwt.decode(auth.accessToken) as jwt.JwtPayload;

    if (!payload) return null;

    return payload.sessionId;
  } catch {
    return null;
  }
};

registerEvent("getSessionHash", getSessionHash);
