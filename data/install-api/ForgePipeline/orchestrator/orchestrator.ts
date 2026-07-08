import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { logger } from "@main/services"
import { setupPrefix, resolveActualPrefix } from "./prefix-setup"
import { ProtonRecommendationService } from "@provision/proton_recommended/services/proton-recommendation"
import { ensureWinetricks } from "@provision/ensure-Makaitricks"
import { takeSnapshot } from "./snapshot"
import { runInstaller } from "./runner"
import { findNewExecutables } from "./change-detector"
import { getSourceFolder } from "./source-resolver"
import { copyFolderToPrefix } from "./prefix-copier"
import { scanPrefixForExes } from "./prefix-scanner"
import { formatCandidates } from "./candidate-formatter"
import { sendInstallLog, sendInstallProgress } from "./progress"
import { getInstallerApiDir } from "@bootstrap/resource-manager"
import { debugLog } from "@provision/debug-log"
import type { InstallOptions, InstallResult } from "./types"

export async function installAndScan(
  filePath: string,
  options: InstallOptions
): Promise<InstallResult> {
  const { gameId, protonPath } = options
  let winePrefixPath = options.winePrefixPath

  debugLog.log("orchestrator_start", {
    filePath,
    gameId,
    protonPath,
    winePrefixPath,
    winetricksVerbs: options.winetricksVerbs,
    installConfig: options.installConfig,
  })

  if (!winePrefixPath) {
    debugLog.log("orchestrator_no_prefix", {})
    return { wasOpened: true, candidates: [], suggestedDir: null }
  }

  /* 1. Setup prefixo + DLLs */
  if (gameId && protonPath) {
    sendInstallProgress("prefix", 80)
    const prefixOk = await setupPrefix(gameId, protonPath, winePrefixPath, sendInstallLog)
    if (!prefixOk) {
      sendInstallLog("ERRO: Não foi possível criar o prefixo Wine.")
      sendInstallProgress("complete", 100)
      debugLog.log("orchestrator_prefix_failed", { gameId, winePrefixPath })
      return { wasOpened: true, candidates: [], suggestedDir: null }
    }
    winePrefixPath = resolveActualPrefix(winePrefixPath)
    debugLog.log("orchestrator_prefix_resolved", { resolved: winePrefixPath })
    sendInstallProgress("dlls", 90)
    try {
      logger.info(`[orchestrator] Installing DLLs for ${gameId} at ${winePrefixPath}...`)
      const extraVerbs = options.winetricksVerbs
      const wtPath = await ensureWinetricks()
      const dllResult = await ProtonRecommendationService.installGameDlls(
        gameId,
        winePrefixPath,
        protonPath,
        extraVerbs,
        wtPath
      )
      logger.info(`[orchestrator] DLL result: ${JSON.stringify(dllResult)}`)
      debugLog.log("orchestrator_dll_result", {
        gameId,
        actualPrefix: winePrefixPath,
        winetricksPath: wtPath,
        extraVerbs,
        installed: dllResult.installed,
        errors: dllResult.errors,
      })
      if (dllResult.installed?.length > 0) {
        sendInstallLog(`DLLs instaladas: ${dllResult.installed.join(", ")}`)
      }
      if (dllResult.errors?.length > 0) {
        sendInstallLog(`Aviso DLLs: ${dllResult.errors.join("; ")}`)
      }
      if (!dllResult.installed?.length && !dllResult.errors?.length) {
        sendInstallLog("DLLs já estavam instaladas. Pulando.")
        logger.info("[orchestrator] All DLLs already installed, skipped winetricks")
      }
    } catch (err) {
      sendInstallLog(`Aviso: falha ao instalar DLLs (ignorado)`)
      logger.warn("[orchestrator] installGameDlls error:", err)
      debugLog.log("orchestrator_dll_error", { error: String(err) })
    }
  }

  /* Resolve prefix path (post-setup ou prefixo já existente) */
  winePrefixPath = resolveActualPrefix(winePrefixPath)
  const driveCPath = path.join(winePrefixPath, "drive_c")

  /* 2. Dependências via bridge (extrai .exe, analisa, baixa do GitHub, instala) */
  try {
    const bridgePath = path.resolve(__dirname, '../../../compatflow/bridge/install-game.js')
    if (fs.existsSync(bridgePath)) {
      sendInstallLog("Analisando dependências do instalador...")
      const out = execFileSync('/usr/bin/node', [
        bridgePath,
        '--deps-only',
        '--exe', filePath,
        '--prefix', winePrefixPath,
        '--proton-path', protonPath || '',
      ], { timeout: 300000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
      const result = JSON.parse(out.trim().split('\n').filter(l => l.trim()).pop() || '{}')
      if (result.success && result.depsDetected?.length > 0) {
        sendInstallLog(`Dependências detectadas: ${result.depsDetected.join(', ')}`)
        for (const dep of result.depsInstalled) {
          if (dep.error) sendInstallLog(`  ${dep.id}: ERRO - ${dep.error}`)
          else sendInstallLog(`  ${dep.id}: OK`)
        }
      } else if (result.error) {
        sendInstallLog(`Aviso bridge deps: ${result.error}`)
      }
    }
  } catch (e) {
    sendInstallLog(`Aviso: análise de dependências falhou (ignorado)`)
    logger.warn('[orchestrator] bridge deps error:', e)
  }

  if (!fs.existsSync(driveCPath)) {
    sendInstallLog("ERRO: drive_c não existe no prefixo.")
    sendInstallProgress("complete", 100)
    return { wasOpened: true, candidates: [], suggestedDir: null }
  }

  /* 3. Classifica instalador e tenta extração nativa */
  sendInstallLog("Analisando instalador...")
  const installerApiDev = path.resolve(__dirname, '../../../compatflow/bridge/installer/index.js')
  const installerApiRes = path.join(getInstallerApiDir(), 'index.js')
  const installerApiPath = fs.existsSync(installerApiDev) ? installerApiDev :
    fs.existsSync(installerApiRes) ? installerApiRes : null
  let nativeExtractResult = null

  if (installerApiPath) {
    try {
      sendInstallLog("Classificando tipo de instalador...")
      const classifyOut = execFileSync('/usr/bin/node', [
        installerApiPath, '--analyze', filePath,
      ], { timeout: 30000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
      const installInfo = JSON.parse(classifyOut.trim())

      sendInstallLog(`Tipo: ${installInfo.type} (${installInfo.method})`)
      logger.info(`[orchestrator] Installer classified: ${installInfo.type} (confidence: ${installInfo.confidence})`)

      if (!installInfo.needsWine) {
        sendInstallLog(`Extraindo nativamente (${installInfo.type})...`)
        const extractOut = execFileSync('/usr/bin/node', [
          installerApiPath, '--extract', filePath,
          '--dest', path.join(driveCPath, 'games', gameId || 'game'),
          '--source', 'catalog',
          '--gameId', gameId || '',
          '--protonPath', protonPath || '',
        ], { timeout: 3600000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })

        const lines = extractOut.trim().split('\n').filter(l => l.trim())
        const lastJson = lines.filter(l => l.startsWith('{')).pop()
        if (lastJson) {
          nativeExtractResult = JSON.parse(lastJson)
        }

        if (nativeExtractResult?.success) {
          sendInstallLog(`Extração nativa concluída: ${nativeExtractResult.candidates.length} executáveis encontrados.`)
          logger.info(`[orchestrator] Native extraction succeeded, ${nativeExtractResult.candidates.length} candidates`)
          sendInstallProgress("complete", 100)
          return {
            wasOpened: true,
            candidates: nativeExtractResult.candidates.map(p => ({
              path: p, name: path.basename(p), size: fs.statSync(p).size,
            })),
            suggestedDir: nativeExtractResult.destDir,
          }
        }
      } else if (installInfo.needsRegistrySetup) {
        sendInstallLog(`Extraindo companions nativamente + registro via Wine...`)
        const extractOut = execFileSync('/usr/bin/node', [
          installerApiPath, '--extract', filePath,
          '--dest', path.join(driveCPath, 'games', gameId || 'game'),
          '--source', 'catalog',
          '--gameId', gameId || '',
          '--protonPath', protonPath || '',
        ], { timeout: 3600000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })

        const lines = extractOut.trim().split('\n').filter(l => l.trim())
        const lastJson = lines.filter(l => l.startsWith('{')).pop()
        if (lastJson) {
          nativeExtractResult = JSON.parse(lastJson)
        }

        if (nativeExtractResult?.success) {
          sendInstallLog(`Extração nativa concluída, verificando executáveis...`)
          const fullScan = scanPrefixForExes(winePrefixPath)
          if (fullScan.candidates.length > 0) {
            sendInstallProgress("complete", 100)
            return { wasOpened: true, ...fullScan }
          }
          sendInstallLog("Nenhum executável encontrado após extração nativa.")
          sendInstallProgress("complete", 100)
          return { wasOpened: true, candidates: [], suggestedDir: driveCPath }
        }
      }
    } catch (e) {
      sendInstallLog(`Aviso: extração nativa falhou (${e.message}). Usando Wine...`)
      logger.warn(`[orchestrator] Native extraction failed: ${e.message}`)
    }
  }

  /* 4. Snapshot ANTES (fallback: extração via Wine) */
  sendInstallLog(`Iniciando instalador via Wine: ${path.basename(filePath)}`)
  logger.info(`[orchestrator] Snapshot before (Wine fallback)`)
  const before = takeSnapshot(driveCPath)

  /* 5. Executa instalador via Wine e aguarda fechar */
  logger.info(`[orchestrator] Running: ${path.basename(filePath)}`)
  const ran = await runInstaller(
    filePath,
    winePrefixPath,
    protonPath,
    gameId,
    options.onLog,
    options.wineDebug,
    options.installConfig
  )
  if (!ran) {
    sendInstallProgress("complete", 100)
    return { wasOpened: true, candidates: [], suggestedDir: null }
  }

  sendInstallLog("Instalador encerrado. Verificando mudanças...")

  /* 6. Snapshot DEPOIS + compara */
  logger.info(`[orchestrator] Snapshot after, comparing...`)
  const after = takeSnapshot(driveCPath)
  const newExes = findNewExecutables(before, after)

  /* 7. Achou .exe novos no prefixo → retorna */
  if (newExes.length > 0) {
    logger.info(`[orchestrator] Found ${newExes.length} new exe(s) in prefix`)
    sendInstallLog(`${newExes.length} executáveis encontrados no prefixo.`)
    const result = formatCandidates(newExes, driveCPath)
    sendInstallProgress("complete", 100)
    return { wasOpened: true, ...result }
  }

  /* 6b. Varredura completa do prefixo (pega exe em users/ etc que o snapshot perde) */
  logger.info(`[orchestrator] No new exe via snapshot, scanning full prefix...`)
  sendInstallLog("Verificando executáveis no prefixo...")
  const fullScan = scanPrefixForExes(winePrefixPath)
  if (fullScan.candidates.length > 0) {
    logger.info(
      `[orchestrator] Found ${fullScan.candidates.length} exe(s) via full scan`
    )
    sendInstallLog(`${fullScan.candidates.length} executáveis encontrados.`)
    sendInstallProgress("complete", 100)
    return { wasOpened: true, ...fullScan }
  }

  /* 7. Não achou → descobre pasta de origem do jogo */
  sendInstallLog("Nenhum executável encontrado. Copiando pasta do jogo...")
  logger.info(`[orchestrator] No new exe found, resolving source folder...`)
  sendInstallProgress("copying", 93)

  /* Tenta a pasta registrada no download */
  const sourcePath = await getSourceFolder(options.gameKey)

  if (!sourcePath) {
    /* ─── Download de arquivo único ───────────────────── */
    sendInstallLog(`Copiando ${path.basename(filePath)} para o prefixo...`)
    const destPath = path.join(driveCPath, path.basename(filePath))
    fs.cpSync(filePath, destPath, { force: true })

    const stat = fs.statSync(destPath)
    if (stat.size > 1024) {
      sendInstallLog(`Copiado: ${path.basename(destPath)}`)
      sendInstallProgress("complete", 100)
      return {
        wasOpened: true,
        candidates: [{
          path: destPath,
          name: path.basename(destPath),
          size: stat.size,
        }],
        suggestedDir: path.dirname(destPath),
      }
    }

    sendInstallProgress("complete", 100)
    return {
      wasOpened: true,
      candidates: [],
      suggestedDir: path.dirname(filePath),
    }
  }

  if (!fs.existsSync(sourcePath)) {
    sendInstallProgress("complete", 100)
    return {
      wasOpened: true,
      candidates: [],
      suggestedDir: driveCPath,
    }
  }

  /* ─── Pasta com arquivos ────────────────────────── */
  logger.info(`[orchestrator] Copying "${sourcePath}" to prefix...`)
  sendInstallLog(`Copiando ${path.basename(sourcePath)} para o prefixo...`)
  await copyFolderToPrefix(sourcePath, winePrefixPath, (pct) => {
    sendInstallLog(`Copiando ${path.basename(sourcePath)}... ${pct}%`)
    sendInstallProgress(`Cópia: ${pct}%`, pct)
  })

  logger.info(`[orchestrator] Scanning prefix for exes...`)
  sendInstallLog("Verificando executáveis após cópia...")
  const scanResult = scanPrefixForExes(winePrefixPath)

  if (scanResult.candidates.length > 0) {
    logger.info(
      `[orchestrator] Found ${scanResult.candidates.length} exe(s) after copy`
    )
    sendInstallLog(`${scanResult.candidates.length} executáveis encontrados.`)
    sendInstallProgress("complete", 100)
    return { wasOpened: true, ...scanResult }
  }

  /* Nada encontrado → abre seletor na pasta de origem */
  sendInstallLog("Nenhum executável encontrado. Selecione manualmente.")
  sendInstallProgress("complete", 100)
  return {
    wasOpened: true,
    candidates: [],
    suggestedDir: sourcePath,
  }
}
