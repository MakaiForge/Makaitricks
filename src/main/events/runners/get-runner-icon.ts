import { registerEvent } from "../register-event";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

registerEvent("getRunnerIcon", async (_event, runnerId: string) => {
  const iconsDir = app.isPackaged
    ? path.join(process.resourcesPath, "emulators", "icons")
    : path.join(app.getAppPath(), "resources", "emulators", "icons");

  const filePath = path.join(iconsDir, `${runnerId}.svg`);
  if (!fs.existsSync(filePath)) return null;

  const svg = fs.readFileSync(filePath, "utf-8");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
});
