import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "SSEEdit", exeName: "SSEEdit.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Wrye Bash", exeName: "Wrye Bash.exe", searchPaths: ["."] },
    { name: "zEdit", exeName: "zEdit.exe", searchPaths: ["."] },
  ];
}
