import { shell } from "electron";
import { registerEvent } from "../register-event";
import { db, storeKeys } from "@main/store";
import type { Auth } from "@types";

const openCheckout = async (_event: Electron.IpcMainInvokeEvent) => {
  const auth = await db.get<string, Auth>(storeKeys.auth, {
    valueEncoding: "json",
  }).catch(() => null) as Auth | null;

  if (!auth) {
    return;
  }

  const params = new URLSearchParams({
    token: auth.refreshToken,
  });

  shell.openExternal(
    `${import.meta.env.MAIN_VITE_CHECKOUT_URL}?${params.toString()}`
  );
};

registerEvent("openCheckout", openCheckout);
