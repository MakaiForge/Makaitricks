import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { logger, WindowManager } from "@main/services"

function walkDir(dir: string): string[] {
  const files: string[] = []
  const seen = new Set<string>()
  const SKIP_DIRS = new Set(["node_modules", ".git", "__pycache__"])
  const walk = (d: string) => {
    const real = fs.realpathSync(d)
    if (seen.has(real)) return
    seen.add(real)
    try {
      const items = fs.readdirSync(d, { withFileTypes: true })
      for (const item of items) {
        if (item.isDirectory() && SKIP_DIRS.has(item.name)) continue
        const full = path.join(d, item.name)
        if (item.isDirectory()) {
          walk(full)
        } else if (item.isFile()) {
          files.push(full)
        }
      }
    } catch { /* skip */ }
  }
  walk(dir)
  return files
}

async function fileSha256(filePath: string): Promise<string | null> {
  try {
    const hash = crypto.createHash("sha256")
    const handle = await fs.promises.open(filePath, "r")
    const buffer = Buffer.alloc(65536)
    try {
      let bytesRead: number
      while ((bytesRead = (await handle.read(buffer, 0, 65536, null)).bytesRead) > 0) {
        hash.update(buffer.subarray(0, bytesRead))
      }
    } finally {
      await handle.close()
    }
    return hash.digest("hex")
  } catch {
    return null
  }
}

async function computeHashes(
  files: string[],
  basePath: string,
  label: string,
  progressCallback?: (percent: number) => void
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  const batchSize = 20
  const total = files.length

  for (let i = 0; i < total; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (filePath) => {
        const relPath = path.relative(basePath, filePath)
        const hash = await fileSha256(filePath)
        return { relPath, hash: hash ?? "" }
      })
    )
    for (const { relPath, hash } of results) {
      hashes[relPath] = hash
    }
    const pct = Math.min(99, Math.round(((i + batch.length) / total) * 100))
    progressCallback?.(pct)
  }

  return hashes
}

export async function copyFolderToPrefix(
  sourcePath: string,
  winePrefixPath: string,
  progressCallback?: (percent: number) => void
): Promise<string> {
  const driveCPath = path.join(winePrefixPath, "drive_c")
  const folderName = path.basename(sourcePath)
  const destPath = path.join(driveCPath, folderName)

  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true })
  }

  const allFiles = walkDir(sourcePath)
  const total = allFiles.length
  if (total === 0) return destPath

  WindowManager.mainWindow?.webContents.send(
    "on-install-log",
    `Calculando SHA256 de ${total} arquivos de origem...`
  )

  const sourceHashes = await computeHashes(allFiles, sourcePath, "origem")
  logger.log(`[copyFolderToPrefix] SHA256 calculado: ${total} arquivos`)

  /* ─── Cópia em lotes assíncronos ─── */
  const BATCH_SIZE = 50
  let copied = 0

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE)
    const tasks = batch.map(async (srcFile) => {
      const relPath = path.relative(sourcePath, srcFile)
      const destFile = path.join(destPath, relPath)
      await fs.promises.mkdir(path.dirname(destFile), { recursive: true })
      await fs.promises.copyFile(srcFile, destFile)
    })
    await Promise.all(tasks)
    copied += batch.length
    const pct = Math.min(99, Math.round((copied / total) * 100))
    progressCallback?.(pct)
  }

  /* ─── Verificação pós-cópia: contagem + hash ─── */
  const destFiles = walkDir(destPath)
  if (destFiles.length !== total) {
    const msg = `Contagem de arquivos não confere: origem ${total}, destino ${destFiles.length}`
    logger.warn(`[copyFolderToPrefix] ${msg}`)
    throw new Error(msg)
  }

  WindowManager.mainWindow?.webContents.send(
    "on-install-log",
    `Verificando SHA256 dos ${total} arquivos copiados...`
  )

  const destHashes = await computeHashes(destFiles, destPath, "destino")

  let hashMismatch = false
  for (const relPath of Object.keys(sourceHashes)) {
    const srcHash = sourceHashes[relPath]
    const dstHash = destHashes[relPath]
    if (!srcHash) continue
    if (!dstHash) {
      logger.warn(`[copyFolderToPrefix] Arquivo faltando no destino: ${relPath}`)
      hashMismatch = true
    } else if (srcHash !== dstHash) {
      logger.warn(
        `[copyFolderToPrefix] Hash mismatch em ${relPath}: ` +
        `origem ${srcHash}, destino ${dstHash}`
      )
      hashMismatch = true
    }
  }

  if (hashMismatch) {
    throw new Error("Verificação de integridade falhou: hashes SHA256 não conferem")
  }

  logger.log(`[copyFolderToPrefix] Cópia concluída: ${total} arquivos, SHA256 verificado`)
  progressCallback?.(100)

  return destPath
}
