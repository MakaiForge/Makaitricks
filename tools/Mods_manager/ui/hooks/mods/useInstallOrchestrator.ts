/**
 * useInstallOrchestrator — Hook React para instalação de mods com progresso.
 *
 * Fornece interface completa para o fluxo de instalação:
 * - Estado atual (stage)
 * - Progresso (percent, message, files)
 * - Resultado (success, plugins, verified)
 * - Controles (start, cancel, dismiss)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  InstallStage,
  InstallProgress,
  InstallResult,
  InstallConfig,
} from "../../types/install.types";

export interface UseInstallOrchestratorReturn {
  /** Stage atual da instalação */
  stage: InstallStage;
  /** Progresso detalhado */
  progress: InstallProgress | null;
  /** Resultado da instalação */
  result: InstallResult | null;
  /** Se está instalando */
  isInstalling: boolean;
  /** Se pode cancelar */
  canCancel: boolean;
  /** Inicia instalação */
  startInstall: (archivePath: string, config?: Partial<InstallConfig>) => Promise<InstallResult | null>;
  /** Cancela instalação */
  cancel: () => void;
  /** Fecha overlay de resultado */
  dismissResult: () => void;
  /** Label do stage atual (traduzido via i18n) */
  stageLabel: string;
  /** Percentual de progresso (0-100) */
  stagePercent: number;
  /** Tempo decorrido formatado ("01:23") */
  elapsedTime: string;
}

export function useInstallOrchestrator(
  gameId: string,
  profile: string,
  stagingDir: string,
  addLog: (msg: string) => void,
  onRefresh: () => void,
): UseInstallOrchestratorReturn {
  const { t } = useTranslation("mod_manager");
  const [stage, setStage] = useState<InstallStage>("idle");
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [result, setResult] = useState<InstallResult | null>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Listener para progresso do backend
  useEffect(() => {
    const cleanup = window.electron.onInstallProgress?.((data: InstallProgress) => {
      setProgress(data);
      setStage(data.stage);
    });
    return () => cleanup?.();
  }, []);

  // Labels de stage traduzidos
  const stageLabels = useMemo<Record<InstallStage, string>>(() => ({
    idle: t("install_stage_idle"),
    reading_archive: t("install_stage_reading_archive"),
    extracting: t("install_stage_extracting"),
    verifying: t("install_stage_verifying"),
    analyzing: t("install_stage_analyzing"),
    saving: t("install_stage_saving"),
    ready: t("install_stage_ready"),
    error: t("install_stage_error"),
  }), [t]);

  /**
   * Inicia instalação de um mod.
   */
  const startInstall = useCallback(
    async (
      archivePath: string,
      configOverrides?: Partial<InstallConfig>,
    ): Promise<InstallResult | null> => {
      const config: InstallConfig = {
        gameId,
        profile,
        stagingDir,
        overwriteExisting: false,
        verifyAfterExtract: true,
        maxRetries: 2,
        timeoutMs: 300_000,
        ...configOverrides,
      };

      setStage("reading_archive");
      setResult(null);

      const modName = archivePath.split("/").pop()?.replace(/\.\w+$/, "") || "unknown";
      addLog(`${t("installing_mod")} ${modName}`);

      console.log("[INSTALL] startInstall called", { gameId, profile, stagingDir, archivePath, config });

      try {
        const installResult = await window.electron.installModOrchestrated(archivePath, config);

        console.log("[INSTALL] installResult received", { success: installResult?.success, error: installResult?.error });
        setResult(installResult);

        if (installResult.success) {
          addLog(
            `✅ ${installResult.modName} ${t("install_complete")}` +
            ` (${installResult.extractedFiles.length} ${t("files")}` +
            `, ${installResult.verified ? t("verified") : t("not_verified")})`,
          );
          await onRefresh();
        } else {
          addLog(`❌ ${t("install_error")}: ${installResult.error}`);
        }

        return installResult;
      } catch (err) {
        const errorStr = String(err);

        // Tratar archive protegido por senha
        if (errorStr.includes("ARCHIVE_PASSWORD_PROTECTED") || /wrong password|encrypted/i.test(errorStr)) {
          const password = window.prompt(`${t("archive_password_protected")}\n${modName}`);
          if (password !== null && password !== "") {
            // Retry com senha
            try {
              const retryResult = await window.electron.installModOrchestrated(archivePath, { ...config, password });
              setResult(retryResult);
              if (retryResult.success) {
                addLog(`✅ ${retryResult.modName} ${t("install_complete")} (${t("verified")})`);
                await onRefresh();
              } else {
                addLog(`❌ ${t("install_error")}: ${retryResult.error}`);
              }
              return retryResult;
            } catch (retryErr) {
              const retryErrorResult: InstallResult = {
                success: false,
                modName,
                stagingDir: config.stagingDir,
                archiveInfo: {
                  path: archivePath,
                  name: archivePath.split("/").pop() || "",
                  totalSize: 0,
                  totalFiles: 0,
                  compressedSize: 0,
                  format: "zip",
                  isPasswordProtected: true,
                  entries: [],
                },
                extractedFiles: [],
                verified: false,
                plugins: [],
                hasFomod: false,
                hasSkse: false,
                category: "unknown",
                error: `${t("install_error")}: ${String(retryErr)}`,
                durationMs: 0,
              };
              setResult(retryErrorResult);
              addLog(`❌ ${t("install_error")}`);
              return retryErrorResult;
            }
          }
          // Usuário cancelou
          addLog(`❌ ${t("install_cancelled")}`);
          setStage("idle");
          return null;
        }

        const errorResult: InstallResult = {
          success: false,
          modName,
          stagingDir: config.stagingDir,
          archiveInfo: {
            path: archivePath,
            name: archivePath.split("/").pop() || "",
            totalSize: 0,
            totalFiles: 0,
            compressedSize: 0,
            format: "zip",
            isPasswordProtected: false,
            entries: [],
          },
          extractedFiles: [],
          verified: false,
          plugins: [],
          hasFomod: false,
          hasSkse: false,
          category: "unknown",
          error: String(err),
          durationMs: 0,
        };
        setResult(errorResult);
        addLog(`❌ ${t("install_error")}: ${String(err)}`);
        return errorResult;
      } finally {
        setStage("idle");
      }
    },
    [gameId, profile, stagingDir, addLog, onRefresh, t],
  );

  /**
   * Cancela instalação em andamento.
   */
  const cancel = useCallback(() => {
    window.electron.abortInstall?.();
    setStage("idle");
    setProgress(null);
    addLog(t("install_cancelled"));
  }, [addLog, t]);

  /**
   * Fecha overlay de resultado.
   */
  const dismissResult = useCallback(() => {
    setResult(null);
  }, []);

  // ── Helpers computados ─────────────────────────────────────────────────

  const isInstalling = stage !== "idle" && stage !== "error";
  const canCancel = isInstalling && stage !== "saving" && stage !== "ready";

  const stagePercent = progress?.percent ??
    (stage === "idle" ? 0 : stage === "ready" ? 100 : 50);

  const elapsedMs = progress?.elapsedMs ?? 0;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const elapsedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    stage,
    progress,
    result,
    isInstalling,
    canCancel,
    startInstall,
    cancel,
    dismissResult,
    stageLabel: stageLabels[stage],
    stagePercent,
    elapsedTime,
  };
}
