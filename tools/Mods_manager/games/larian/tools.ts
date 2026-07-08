import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "BG3 Mod Manager", exeName: "bg3mm.exe", searchPaths: ["."] },
  ];
}
