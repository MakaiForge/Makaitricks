import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { logger } from "@main/services"

export function getUmuBinaryPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "umu-run")
    : path.join(__dirname, "..", "..", "resources", "binaries", "umu-run")
}

export function resolveActualPrefix(prefixPath: string): string {
  const driveC = path.join(prefixPath, "drive_c")
  if (fs.existsSync(driveC)) return prefixPath
  const pfx = path.join(prefixPath, "pfx")
  if (fs.existsSync(path.join(pfx, "drive_c"))) return pfx
  return prefixPath
}

function ensurePrefixMarkers(prefixPath: string) {
  for (const name of ["system.reg", "user.reg", "userdef.reg"]) {
    const filePath = path.join(prefixPath, name)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "REGEDIT4\n\n", "utf-8")
    }
  }
}

const PREFIX_MARKERS = ["drive_c", "dosdevices", "system.reg", "user.reg", "userdef.reg"]

function prefixIsValid(prefixPath: string): boolean {
  return PREFIX_MARKERS.every((f) => fs.existsSync(path.join(prefixPath, f)))
}

export async function setupPrefix(
  gameId: string,
  protonPath: string,
  winePrefixPath: string,
  onLog?: (msg: string) => void
): Promise<boolean> {
  if (prefixIsValid(winePrefixPath)) {
    if (onLog) onLog(`Prefixo já existe em: ${winePrefixPath}`)
    return true
  }

  if (!fs.existsSync(winePrefixPath)) {
    fs.mkdirSync(winePrefixPath, { recursive: true })
  }

  const umuBinary = getUmuBinaryPath()
  if (!fs.existsSync(umuBinary)) {
    logger.error(`[setupPrefix] umu-run not found at ${umuBinary}`)
    if (onLog) onLog(`umu-run não encontrado.`)
    return false
  }

  if (onLog) onLog(`Criando prefixo Wine em: ${winePrefixPath}`)

  const env = {
    ...process.env,
    GAMEID: `umu-${gameId}`,
    WINEPREFIX: winePrefixPath,
    PROTONPATH: protonPath,
  }

  return new Promise<boolean>((resolve) => {
    const child = spawn(umuBinary, ["wineboot", "-u"], { env, stdio: "ignore" })

    const timeout = setTimeout(() => {
      child.kill()
      logger.error(`[setupPrefix] Timeout after 120s`)
      if (onLog) onLog(`Tempo limite excedido.`)
      resolve(false)
    }, 120_000)

    child.on("exit", (code) => {
      clearTimeout(timeout)
      const actual = resolveActualPrefix(winePrefixPath)
      ensurePrefixMarkers(actual)
      const valid = prefixIsValid(actual)
      if (valid) {
        logger.info(`[setupPrefix] Prefix created at ${actual}`)
        if (onLog) onLog(`Prefixo criado com sucesso.`)
      } else {
        logger.error(`[setupPrefix] Exit code ${code}, prefix invalid at ${actual}`)
        if (onLog) onLog(`Falha: prefixo inválido em ${actual}`)
      }
      resolve(valid)
    })

    child.on("error", (err) => {
      clearTimeout(timeout)
      logger.error(`[setupPrefix] Spawn error: ${err.message}`)
      if (onLog) onLog(`Erro ao executar umu-run.`)
      resolve(false)
    })
  })
}
