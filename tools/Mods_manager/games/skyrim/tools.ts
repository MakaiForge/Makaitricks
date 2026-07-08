import type { ExternalToolDef } from "../_shared/types";

export function getSkyrimTools(): ExternalToolDef[] {
  return [
    { name: "SSEEdit", exeName: "SSEEdit.exe", searchPaths: ["."] },
    { name: "FNIS", exeName: "FNIS.exe", searchPaths: ["."] },
    { name: "BodySlide", exeName: "BodySlide.exe", searchPaths: ["."] },
    { name: "Outfit Studio", exeName: "OutfitStudio.exe", searchPaths: ["."] },
    { name: "LOOT", exeName: "LOOT.exe", searchPaths: ["."] },
    { name: "Wrye Bash", exeName: "Wrye Bash.exe", searchPaths: ["."] },
    { name: "Creation Kit", exeName: "CreationKit.exe", searchPaths: ["."] },
    { name: "zEdit", exeName: "zEdit.exe", searchPaths: ["."] },
    { name: "Cathedral Assets Optimizer", exeName: "CAO.exe", searchPaths: ["."] },
    { name: "Nemesis", exeName: "Nemesis Unlimited Behavior Engine.exe", searchPaths: ["."] },
    { name: "BethINI", exeName: "BethINI.exe", searchPaths: ["."] },
    { name: "Pandora Behavior Engine+", exeName: "Pandora Behaviour Engine+.exe", searchPaths: ["."] },
    { name: "DynDOLOD", exeName: "DynDOLODx64.exe", searchPaths: ["."] },
    { name: "TexGen", exeName: "TexGenx64.exe", searchPaths: ["."] },
    { name: "xLODGen", exeName: "xLODGenx64.exe", searchPaths: ["."] },
    { name: "ESLifier", exeName: "ESLifier.exe", searchPaths: ["."] },
    { name: "VRAMr", exeName: "VRAMr.exe", searchPaths: ["."] },
    { name: "BENDr", exeName: "BENDr.exe", searchPaths: ["."] },
    { name: "ParallaxR", exeName: "ParallaxR.exe", searchPaths: ["."] },
  ];
}
