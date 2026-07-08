import path from "node:path"
import type { SnapshotEntry, InstallCandidate } from "./types"

export function formatCandidates(
  newExes: SnapshotEntry[],
  driveCPath: string
): { candidates: InstallCandidate[]; suggestedDir: string } {
  const candidates: InstallCandidate[] = newExes.map((e) => ({
    path: path.join(driveCPath, e.path),
    name: path.basename(e.path),
    size: e.size,
  }))

  const suggestedDir = path.dirname(candidates[0].path)

  return { candidates, suggestedDir }
}
