import type { SnapshotEntry } from "./types"

const WINE_INTERNAL_DIR_PREFIXES = [
  "windows/",
  "windows/system32/",
  "windows/syswow64/",
  "windows/system/",
  "windows/winsxs/",
  "windows/installer/",
  "windows/temp/",
  "windows/msdownld.tmp/",
  "ProgramData/",
  "Config.Msi/",
  "$Recycle.Bin/",
]

function isWineInternalDir(path: string): boolean {
  const lower = path.toLowerCase()
  return WINE_INTERNAL_DIR_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

export function hasMeaningfulChanges(
  before: SnapshotEntry[],
  after: SnapshotEntry[]
): boolean {
  const beforeMap = new Map(before.map((e) => [e.path, e.size]))

  const newItems = after.filter((a) => {
    const bSize = beforeMap.get(a.path)
    if (bSize === undefined) return true
    return Math.abs(a.size - bSize) > 1024
  })

  const nonWineNew = newItems.filter(
    (e) => !isWineInternalDir(e.path)
  )

  const hasNewExe = nonWineNew.some((e) =>
    e.path.toLowerCase().endsWith(".exe")
  )
  const totalNewSize = nonWineNew.reduce((s, e) => s + e.size, 0)

  return hasNewExe || totalNewSize > 2 * 1024 * 1024
}

export function findNewExecutables(
  before: SnapshotEntry[],
  after: SnapshotEntry[]
): SnapshotEntry[] {
  const beforePaths = new Set(before.map((e) => e.path))
  const beforeDirs = new Set(
    before.filter((e) => e.isDirectory).map((e) => e.path)
  )

  after.sort((a, b) => b.mtimeMs - a.mtimeMs)

  const allFilesInNewDirs: SnapshotEntry[] = []
  const allFilesInExistingDirs: SnapshotEntry[] = []

  const seen = new Set<string>()

  for (const entry of after) {
    if (entry.isDirectory) continue
    if (!entry.path.toLowerCase().endsWith(".exe")) continue
    if (isWineInternalDir(entry.path)) continue
    if (beforePaths.has(entry.path)) continue
    if (seen.has(entry.path)) continue
    seen.add(entry.path)

    const parentDir = entry.path.includes("/")
      ? entry.path.substring(0, entry.path.lastIndexOf("/"))
      : ""

    const parentIsNew = parentDir && !beforeDirs.has(parentDir)

    if (parentIsNew) {
      allFilesInNewDirs.push(entry)
    } else {
      allFilesInExistingDirs.push(entry)
    }
  }

  allFilesInNewDirs.sort((a, b) => b.mtimeMs - a.mtimeMs)
  allFilesInExistingDirs.sort((a, b) => b.mtimeMs - a.mtimeMs)

  return [...allFilesInNewDirs, ...allFilesInExistingDirs]
}
