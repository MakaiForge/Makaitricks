import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "SSEEdit", exeName: "SSEEdit.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Creation Kit", exeName: "CreationKit.exe", searchPaths: ["."] },
    { name: "zEdit", exeName: "zEdit.exe", searchPaths: ["."] },
    { name: "BethINI", exeName: "BethINI.exe", searchPaths: ["."] },
  ];
}
