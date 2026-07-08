import path from "node:path"
import { findGameExecutables } from "@main/helpers/find-game-exe"
import type { FolderScanResult, InstallCandidate } from "./types"

export function scanPrefixForExes(
  winePrefixPath: string
): FolderScanResult {
  const scan = findGameExecutables(winePrefixPath)

  if (scan.candidates.length > 0) {
    const candidates: InstallCandidate[] = scan.candidates.map((c) => ({
      path: c.path,
      name: c.name,
      size: c.size,
    }))

    return {
      candidates,
      suggestedDir: scan.suggestedDir,
    }
  }

  const driveCPath = path.join(winePrefixPath, "drive_c")
  return {
    candidates: [],
    suggestedDir: driveCPath,
  }
}
