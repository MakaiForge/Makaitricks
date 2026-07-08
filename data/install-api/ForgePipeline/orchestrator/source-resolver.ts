import path from "node:path"
import fs from "node:fs"
import { downloadsStore } from "@main/store"
import { getDownloadsPath } from "@main/events/helpers/get-downloads-path"

export async function getSourceFolder(
  gameKey?: string
): Promise<string | null> {
  if (!gameKey) return null

  const download = await downloadsStore.get(gameKey).catch(() => null)
  if (!download?.folderName) return null

  const gamePath = path.join(
    download.downloadPath ?? (await getDownloadsPath()),
    download.folderName
  )

  if (!fs.existsSync(gamePath) || !fs.lstatSync(gamePath).isDirectory()) {
    return null
  }

  return gamePath
}

export function getParentFolder(filePath: string): string {
  return path.dirname(filePath)
}
