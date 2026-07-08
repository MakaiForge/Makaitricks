import fs from "node:fs"
import path from "node:path"
import type { SnapshotEntry } from "./types"

export function takeSnapshot(prefixDriveC: string): SnapshotEntry[] {
  const entries: SnapshotEntry[] = []

  const walk = (dir: string, relativePrefix: string) => {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true })
      for (const item of items) {
        const full = path.join(dir, item.name)
        const rel = relativePrefix
          ? `${relativePrefix}/${item.name}`
          : item.name
        if (item.isDirectory()) {
          try {
            const stat = fs.statSync(full)
            entries.push({ path: rel, size: 0, mtimeMs: stat.mtimeMs, isDirectory: true })
          } catch {
            /* skip */
          }
          walk(full, rel)
        } else if (item.isFile()) {
          try {
            const stat = fs.statSync(full)
            entries.push({ path: rel, size: stat.size, mtimeMs: stat.mtimeMs, isDirectory: false })
          } catch {
            /* skip unreadable files */
          }
        }
      }
    } catch {
      /* skip unreadable dirs */
    }
  }

  walk(prefixDriveC, "")
  return entries
}
