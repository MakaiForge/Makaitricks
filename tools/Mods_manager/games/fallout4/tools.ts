import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "SSEEdit", exeName: "SSEEdit.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Wrye Bash", exeName: "Wrye Bash.exe", searchPaths: ["."] },
    { name: "Creation Kit", exeName: "CreationKit.exe", searchPaths: ["."] },
    { name: "zEdit", exeName: "zEdit.exe", searchPaths: ["."] },
    { name: "BodySlide", exeName: "BodySlide.exe", searchPaths: ["."] },
    { name: "Outfit Studio", exeName: "OutfitStudio.exe", searchPaths: ["."] },
    { name: "Cathedral Assets Optimizer", exeName: "CAO.exe", searchPaths: ["."] },
    { name: "BethINI", exeName: "BethINI.exe", searchPaths: ["."] },
  ];
}
