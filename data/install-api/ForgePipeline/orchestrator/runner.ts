import path from "node:path"
import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { Umu } from "@main/services"
import { logger } from "@main/services"
import { debugLog } from "@provision/debug-log"

interface InstallConfigOpts {
  dxvk?: boolean | null
  vkd3d?: boolean | null
  esync?: boolean | null
  fsync?: boolean | null
  env?: Record<string, string>
}

export async function runInstaller(
  filePath: string,
  winePrefixPath: string,
  protonPath?: string | null,
  gameId?: string,
  onLog?: (line: string) => void,
  wineDebug?: string,
  installConfig?: InstallConfigOpts
): Promise<boolean> {
  const disableUnless = (key: string, enabled: boolean | null | undefined): string =>
    enabled === true ? "0" : "1"

  try {
    if (!protonPath) {
      await Umu.launchInstaller(filePath, [], {
        gameId,
        winePrefixPath,
        protonPath: null,
        onLog,
        wineDebug: wineDebug || "-all",
        customEnv: {
          PROTON_NO_ESYNC: disableUnless("esync", installConfig?.esync),
          PROTON_NO_FSYNC: disableUnless("fsync", installConfig?.fsync),
          PROTON_NO_D3D11: "1",
          PROTON_NO_VKD3D: disableUnless("vkd3d", installConfig?.vkd3d),
          PROTON_NO_D3D12: "1",
          PROTON_NO_NVAPI: "1",
          PROTON_HEAPTYPES: "0",
          PROTON_HIDE_NVIDIA_GPU: "1",
          PROTON_USE_WINED3D11: disableUnless("dxvk", installConfig?.dxvk),
          ...(installConfig?.env || {}),
        },
      })
      return true
    }

    const wineBin = path.join(protonPath, "files", "bin", "wine64")
    const wineFallback = path.join(protonPath, "files", "bin", "wine")
    const wineExe = (await fs.promises.stat(wineBin).then(() => true).catch(() => false)) ? wineBin : wineFallback

    const env: Record<string, string> = {
      WINEPREFIX: winePrefixPath,
      WINEDEBUG: "-all",
      PROTON_LOG: "1",
      PROTON_NO_ESYNC: disableUnless("esync", installConfig?.esync),
      PROTON_NO_FSYNC: disableUnless("fsync", installConfig?.fsync),
      PROTON_NO_D3D11: "1",
      PROTON_NO_VKD3D: disableUnless("vkd3d", installConfig?.vkd3d),
      PROTON_NO_D3D12: "1",
      PROTON_NO_NVAPI: "1",
      PROTON_HEAPTYPES: "0",
      PROTON_HIDE_NVIDIA_GPU: "1",
      PROTON_USE_WINED3D11: disableUnless("dxvk", installConfig?.dxvk),
      ...(installConfig?.env || {}),
    }

    logger.info(`[runInstaller] Wine: ${wineExe}`)
    logger.info(`[runInstaller] WINEPREFIX: ${winePrefixPath}`)
    if (onLog) onLog(`Executando instalador via Wine do Proton (modo instalação): ${filePath}`)
    debugLog.log("runner_exec", {
      wineExe,
      winePrefixPath,
      filePath,
      envKeys: Object.keys(env),
      installConfig,
    })

    const result = spawnSync(wineExe, [filePath], { env, stdio: "inherit", timeout: 3600000 })
    debugLog.log("runner_exit", { status: result.status, signal: result.signal, error: result.error?.message })
    return result.status === 0
  } catch (err) {
    logger.error("[runInstaller] Launch failed", err)
    debugLog.log("runner_error", { error: String(err) })
    return false
  }
}

export async function runExecutable(
  filePath: string,
  winePrefixPath: string,
  protonPath?: string | null,
  gameId?: string
): Promise<boolean> {
  try {
    await Umu.launchExecutable(filePath, [], {
      gameId,
      winePrefixPath,
      protonPath,
    })
    return true
  } catch (err) {
    logger.error("[runExecutable] Launch failed", err)
    return false
  }
}
