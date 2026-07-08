import type { GameShop } from "@types";

export type WineTool =
  | "winetricks"
  | "taskmgr"
  | "control"
  | "regedit"
  | "winecfg"
  | "wineconsole"
  | "terminal"
  | "runexe"
  | "winelog";

export interface WineToolOptions {
  shop: GameShop;
  objectId: string;
  prefix: string;
  tool: WineTool;
}

export interface WineToolResult {
  success: boolean;
  error?: string;
}
