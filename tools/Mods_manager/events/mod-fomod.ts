import { registerEvent } from "@main/events/register-event";
import { FomodService } from "@mods/services/fomod/fomod-service";

registerEvent("parseFomod", async (_event, stagingDir: string) => {
  return FomodService.parse(stagingDir);
});

registerEvent("installFomod", async (_event, stagingDir: string, targetDir: string, selections: Record<string, string[]>) => {
  return FomodService.install(stagingDir, targetDir, selections);
});
