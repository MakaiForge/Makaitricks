import { registerEvent } from "@main/events/register-event";
import { ensureGamePrefix } from "../core/init";

registerEvent("ensureGamePrefix", async (_event, appId: string, protonName?: string) => {
  return ensureGamePrefix({ appId, protonName });
});
