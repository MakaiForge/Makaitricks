import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "WolvenKit", exeName: "WolvenKit.exe", searchPaths: ["."] },
    { name: "ArchiveXL", exeName: "", searchPaths: [] },
    { name: "TweakXL", exeName: "", searchPaths: [] },
    { name: "Codeware", exeName: "", searchPaths: [] },
  ];
}
