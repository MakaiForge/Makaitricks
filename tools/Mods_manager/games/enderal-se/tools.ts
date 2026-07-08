import type { ExternalToolDef } from "../_shared/types";

export function getTools(): ExternalToolDef[] {
  return [
    { name: "EnderalEdit", exeName: "EnderalEdit.exe", searchPaths: ["."] },
    { name: "SSEEdit", exeName: "SSEEdit.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Wrye Bash", exeName: "Wrye Bash.exe", searchPaths: ["."] },
    { name: "BethINI", exeName: "BethINI.exe", searchPaths: ["."] },
    { name: "FNIS", exeName: "FNIS.exe", searchPaths: ["."] },
    { name: "Nemesis", exeName: "Nemesis Unlimited Behavior Engine.exe", searchPaths: ["."] },
  ];
}
