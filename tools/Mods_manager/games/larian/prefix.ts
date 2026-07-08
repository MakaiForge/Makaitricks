import { applyWineDllOverrides } from "../_shared/prefix";
import { BG3_DLL_OVERRIDES } from "./larian.constants";

export function getDllOverrides(): Record<string, string> {
  return { ...BG3_DLL_OVERRIDES };
}

export function applyOverrides(prefixPath: string): void {
  applyWineDllOverrides(prefixPath, getDllOverrides());
}
