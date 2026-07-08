import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "FNVEdit", exeName: "FNVEdit.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Wrye Flash", exeName: "Wrye Flash.exe", searchPaths: ["."] },
    { name: "GECK", exeName: "GECK.exe", searchPaths: ["."] },
    { name: "zEdit", exeName: "zEdit.exe", searchPaths: ["."] },
  ];
}
