import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "TES4Edit", exeName: "TES4Edit.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Wrye Bash", exeName: "Wrye Bash.exe", searchPaths: ["."] },
    { name: "TES4LodGen", exeName: "TES4LodGen.exe", searchPaths: ["."] },
    { name: "Construction Set", exeName: "TESConstructionSet.exe", searchPaths: ["."] },
    { name: "zEdit", exeName: "zEdit.exe", searchPaths: ["."] },
  ];
}
