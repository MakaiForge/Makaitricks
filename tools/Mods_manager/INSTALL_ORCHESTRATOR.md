# Mod Install Orchestrator — Sistema de Instalação com Verificação

## Visão Geral

Este documento descreve o novo sistema de instalação de mods com orquestração completa, verificação de integridade e suporte a multiidioma.

### Problemas Atuais

1. **Progresso inconsistente**: O `extract7z()` depende do stdout do binário 7z para reportar progresso. Se o 7z não mandar output, a UI trava em "Aguarde..."
2. **Sem verificação pós-extração**: Não verifica se os arquivos foram extraídos corretamente
3. **Sem estado persistente**: Não existe `ModInstallStatus` — apenas booleans `installing`/`deploying`
4. **Textos hardcoded em inglês**: OverwriteModal e mensagens de progresso não usam `t()`
5. **Confusão "Adicionar" vs "Instalar"**: O botão "Adicionar Mod" extrai E salva no modlist sem verificação

### Solução

Criar um **Orchestrator** que gerencia o ciclo de vida completo da instalação:

```
[waiting] → [reading_archive] → [extracting] → [verifying] → [analyzing] → [saving] → [ready] → [deploying] → [deployed]
                                      ↓              ↓              ↓
                                  [error]        [error]        [error]
```

---

## Arquitetura

### 1. Tipos Compartilhados (`types/install.types.ts`)

```typescript
export type InstallStage =
  | "idle"
  | "reading_archive"
  | "extracting"
  | "verifying"
  | "analyzing"
  | "saving"
  | "ready"
  | "deploying"
  | "deployed"
  | "error";

export interface ArchiveInfo {
  path: string;
  name: string;
  totalSize: number;          // bytes
  totalFiles: number;
  compressedSize: number;
  format: "zip" | "7z" | "rar" | "fomod" | "tar.gz";
  isPasswordProtected: boolean;
  entries: ArchiveEntry[];
}

export interface ArchiveEntry {
  path: string;
  size: number;               // bytes
  compressedSize: number;
  isDirectory: boolean;
  crc32?: string;             // CRC32 do arquivo no archive
}

export interface ExtractedFile {
  relativePath: string;
  absolutePath: string;
  expectedSize: number;
  actualSize: number;
  expectedCrc32?: string;
  actualCrc32?: string;
  verified: boolean;
}

export interface InstallProgress {
  stage: InstallStage;
  percent: number;            // 0-100
  message: string;            // Traduzido
  modName: string;
  archiveInfo?: ArchiveInfo;
  extractedFiles?: ExtractedFile[];
  currentFile?: string;       // Arquivo sendo processado
  filesProcessed: number;
  filesTotal: number;
  bytesProcessed: number;
  bytesTotal: number;
  startTime: number;
  elapsedMs: number;
}

export interface InstallResult {
  success: boolean;
  modName: string;
  stagingDir: string;
  archiveInfo: ArchiveInfo;
  extractedFiles: ExtractedFile[];
  verified: boolean;          // Todos os arquivos verificados
  plugins: string[];
  hasFomod: boolean;
  hasSkse: boolean;
  category: string;
  error?: string;
  durationMs: number;
}

export interface InstallConfig {
  gameId: string;
  profile: string;
  stagingDir: string;
  overwriteExisting: boolean;
  verifyAfterExtract: boolean;   // default: true
  maxRetries: number;            // default: 2
  timeoutMs: number;             // default: 300000 (5 min)
}
```

### 2. Orchestrator (`services/install-orchestrator.ts`)

```typescript
import type {
  InstallStage,
  InstallProgress,
  InstallResult,
  InstallConfig,
  ArchiveInfo,
  ExtractedFile,
} from "@types/install.types";

type ProgressCallback = (progress: InstallProgress) => void;
type StageCallback = (from: InstallStage, to: InstallStage) => void;

export class InstallOrchestrator {
  private currentStage: InstallStage = "idle";
  private progress: InstallProgress;
  private onProgress: ProgressCallback;
  private onStageChange: StageCallback;
  private abortController: AbortController | null = null;

  constructor(
    private config: InstallConfig,
    onProgress: ProgressCallback,
    onStageChange: StageCallback,
  ) {
    this.onProgress = onProgress;
    this.onStageChange = onStageChange;
    this.progress = {
      stage: "idle",
      percent: 0,
      message: "",
      modName: "",
      filesProcessed: 0,
      filesTotal: 0,
      bytesProcessed: 0,
      bytesTotal: 0,
      startTime: 0,
      elapsedMs: 0,
    };
  }

  async install(archivePath: string): Promise<InstallResult> {
    this.abortController = new AbortController();
    this.progress.startTime = Date.now();
    this.progress.modName = this.extractModName(archivePath);

    try {
      // ── Stage 1: Read Archive ──
      await this.transitionTo("reading_archive");
      const archiveInfo = await this.readArchive(archivePath);
      this.progress.archiveInfo = archiveInfo;
      this.progress.filesTotal = archiveInfo.totalFiles;
      this.progress.bytesTotal = archiveInfo.totalSize;
      this.updateProgress(5, `Arquivo: ${archiveInfo.totalFiles} arquivos, ${this.formatSize(archiveInfo.totalSize)}`);

      // ── Stage 2: Extract ──
      await this.transitionTo("extracting");
      const extractedFiles = await this.extractArchive(archivePath, archiveInfo);

      // ── Stage 3: Verify ──
      if (this.config.verifyAfterExtract) {
        await this.transitionTo("verifying");
        await this.verifyExtractedFiles(extractedFiles, archiveInfo);
      }

      // ── Stage 4: Analyze ──
      await this.transitionTo("analyzing");
      const analysis = await this.analyzeMod();

      // ── Stage 5: Save ──
      await this.transitionTo("saving");
      await this.saveToModlist(analysis);

      // ── Stage 6: Ready ──
      await this.transitionTo("ready");
      this.updateProgress(100, "Instalação concluída");

      return this.buildResult(archiveInfo, extractedFiles, analysis);

    } catch (error) {
      await this.transitionTo("error");
      this.progress.message = String(error);
      this.onProgress({ ...this.progress });

      return {
        success: false,
        modName: this.progress.modName,
        stagingDir: this.config.stagingDir,
        archiveInfo: this.progress.archiveInfo!,
        extractedFiles: this.progress.extractedFiles || [],
        verified: false,
        plugins: [],
        hasFomod: false,
        hasSkse: false,
        category: "unknown",
        error: String(error),
        durationMs: Date.now() - this.progress.startTime,
      };
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  private async transitionTo(stage: InstallStage): Promise<void> {
    const from = this.currentStage;
    this.currentStage = stage;
    this.progress.stage = stage;
    this.onStageChange(from, stage);
  }

  private updateProgress(percent: number, message: string): void {
    this.progress.percent = Math.min(100, Math.max(0, percent));
    this.progress.message = message;
    this.progress.elapsedMs = Date.now() - this.progress.startTime;
    this.onProgress({ ...this.progress });
  }

  private async readArchive(archivePath: string): Promise<ArchiveInfo> {
    // Usa 7z l para listar sem extrair
    // Retorna lista completa de arquivos com tamanhos e CRC32
    throw new Error("Not implemented");
  }

  private async extractArchive(
    archivePath: string,
    archiveInfo: ArchiveInfo,
  ): Promise<ExtractedFile[]> {
    // Extrai com progresso por arquivo
    // Atualiza filesProcessed e bytesProcessed a cada arquivo
    throw new Error("Not implemented");
  }

  private async verifyExtractedFiles(
    extracted: ExtractedFile[],
    archiveInfo: ArchiveInfo,
  ): Promise<void> {
    // Compara cada arquivo extraído com o esperado:
    // - Tamanho igual
    // - CRC32 igual (se disponível)
    // - Arquivo não está vazio
    // - Arquivo não está corrompido
    throw new Error("Not implemented");
  }

  private async analyzeMod(): Promise<any> {
    // analyzeMod + detectModType + inventoryMod
    throw new Error("Not implemented");
  }

  private async saveToModlist(analysis: any): Promise<void> {
    // Salva no ModStorageService
    throw new Error("Not implemented");
  }

  private extractModName(archivePath: string): string {
    return archivePath
      .split("/")
      .pop()
      ?.replace(/\.(zip|7z|rar|fomod|tar\.gz)$/i, "") || "unknown";
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  private buildResult(
    archiveInfo: ArchiveInfo,
    extractedFiles: ExtractedFile[],
    analysis: any,
  ): InstallResult {
    const allVerified = extractedFiles.every((f) => f.verified);
    return {
      success: true,
      modName: this.progress.modName,
      stagingDir: this.config.stagingDir,
      archiveInfo,
      extractedFiles,
      verified: allVerified,
      plugins: analysis.plugins || [],
      hasFomod: analysis.hasFomod || false,
      hasSkse: analysis.hasSkse || false,
      category: analysis.category || "unknown",
      durationMs: Date.now() - this.progress.startTime,
    };
  }
}
```

### 3. Archive Reader (`services/archive-reader.ts`)

```typescript
import { spawn } from "node:child_process";
import type { ArchiveInfo, ArchiveEntry } from "@types/install.types";

/**
 * Lê informações do archive SEM extrair.
 * Usa `7z l` para listar conteúdo com CRC32 e tamanhos.
 */
export async function readArchiveInfo(archivePath: string): Promise<ArchiveInfo> {
  return new Promise((resolve, reject) => {
    const args = ["l", archivePath, "-slt"]; // -slt = output detalhado
    const child = spawn("7z", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        // Verificar se é password protected
        if (/wrong password|encrypted|can not open/i.test(stderr)) {
          reject(new Error("ARCHIVE_PASSWORD_PROTECTED"));
          return;
        }
        reject(new Error(`7z listing failed: ${stderr}`));
        return;
      }

      try {
        const info = parse7zListing(stdout, archivePath);
        resolve(info);
      } catch (err) {
        reject(err);
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start 7z: ${err.message}`));
    });
  });
}

function parse7zListing(output: string, archivePath: string): ArchiveInfo {
  const lines = output.split("\n");
  const entries: ArchiveEntry[] = [];
  let totalSize = 0;
  let compressedSize = 0;
  let currentEntry: Partial<ArchiveEntry> = {};

  // Parsing do output do 7z l -slt
  // Formato:
  // Path = ...
  // Size = ...
  // Pack Size = ...
  // CRC = ...

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("Path = ")) {
      if (currentEntry.path) {
        entries.push(currentEntry as ArchiveEntry);
      }
      currentEntry = {
        path: trimmed.slice(7),
        size: 0,
        compressedSize: 0,
        isDirectory: false,
      };
    } else if (trimmed.startsWith("Size = ")) {
      currentEntry.size = parseInt(trimmed.slice(7), 10) || 0;
    } else if (trimmed.startsWith("Pack Size = ")) {
      currentEntry.compressedSize = parseInt(trimmed.slice(12), 10) || 0;
    } else if (trimmed.startsWith("CRC = ")) {
      currentEntry.crc32 = trimmed.slice(6);
    } else if (trimmed.startsWith("Folder = +")) {
      currentEntry.isDirectory = true;
    }
  }

  // Último entry
  if (currentEntry.path) {
    entries.push(currentEntry as ArchiveEntry);
  }

  // Calcular totais
  for (const entry of entries) {
    if (!entry.isDirectory) {
      totalSize += entry.size;
      compressedSize += entry.compressedSize;
    }
  }

  const format = detectFormat(archivePath);
  const name = archivePath.split("/").pop() || "";

  return {
    path: archivePath,
    name,
    totalSize,
    totalFiles: entries.filter((e) => !e.isDirectory).length,
    compressedSize,
    format,
    isPasswordProtected: false,
    entries,
  };
}

function detectFormat(path: string): ArchiveInfo["format"] {
  if (path.endsWith(".zip") || path.endsWith(".fomod")) return "zip";
  if (path.endsWith(".7z")) return "7z";
  if (path.endsWith(".rar")) return "rar";
  if (path.endsWith(".tar.gz")) return "tar.gz";
  return "zip";
}

/**
 * Verifica se um archive está protegido por senha.
 */
export async function checkPasswordProtected(archivePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("7z", ["t", archivePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0 && /wrong password|encrypted|can not open/i.test(stderr)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    child.on("error", () => resolve(false));
  });
}
```

### 4. Extractor com Progresso (`services/archive-extractor.ts`)

```typescript
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ArchiveInfo, ExtractedFile } from "@types/install.types";

type ExtractProgressCallback = (
  filesProcessed: number,
  filesTotal: number,
  bytesProcessed: number,
  bytesTotal: number,
  currentFile: string,
) => void;

/**
 * Extrai archive com progresso por arquivo.
 * Usa `7z x` com saída parseada para rastrear cada arquivo.
 */
export async function extractWithProgress(
  archivePath: string,
  targetDir: string,
  archiveInfo: ArchiveInfo,
  password?: string,
  onProgress?: ExtractProgressCallback,
  abortSignal?: AbortSignal,
): Promise<ExtractedFile[]> {
  // Preparar diretório
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const args = ["x", archivePath, `-o${targetDir}`, "-y", "-bsp1"];
  if (password) args.push(`-p${password}`);

  return new Promise((resolve, reject) => {
    const child = spawn("7z", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let filesProcessed = 0;
    const filesTotal = archiveInfo.totalFiles;
    let bytesProcessed = 0;
    const bytesTotal = archiveInfo.totalSize;
    let currentFile = "";
    const extractedFiles: ExtractedFile[] = [];

    // Parse da saída do 7z para rastrear arquivos
    // Formato típico: "Extracting  path/to/file.ext"
    child.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const match = line.match(/Extracting\s+(.+)/);
        if (match) {
          currentFile = match[1].trim();

          // Encontrar info do arquivo no archiveInfo
          const archiveEntry = archiveInfo.entries.find(
            (e) => e.path === currentFile || e.path.replace(/\\/g, "/") === currentFile,
          );

          if (archiveEntry && !archiveEntry.isDirectory) {
            filesProcessed++;
            bytesProcessed += archiveEntry.size;

            // Registrar arquivo extraído
            const absolutePath = path.join(targetDir, currentFile);
            extractedFiles.push({
              relativePath: currentFile,
              absolutePath,
              expectedSize: archiveEntry.size,
              actualSize: 0, // Será verificado depois
              expectedCrc32: archiveEntry.crc32,
              actualCrc32: undefined,
              verified: false,
            });

            // Reportar progresso
            onProgress?.(
              filesProcessed,
              filesTotal,
              bytesProcessed,
              bytesTotal,
              currentFile,
            );
          }
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      // Ignorar erros menores
    });

    // Verificar abort
    abortSignal?.addEventListener("abort", () => {
      child.kill("SIGTERM");
      setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
      }, 2000);
      reject(new Error("ABORTED"));
    });

    child.on("close", (code) => {
      if (code === 0) {
        // Atualizar tamanhos reais dos arquivos extraídos
        for (const file of extractedFiles) {
          try {
            const stat = fs.statSync(file.absolutePath);
            file.actualSize = stat.size;
          } catch {
            file.actualSize = 0;
          }
        }
        resolve(extractedFiles);
      } else {
        reject(new Error(`Extraction failed with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start 7z: ${err.message}`));
    });
  });
}
```

### 5. Verificador de Integridade (`services/integrity-checker.ts`）

```typescript
import fs from "node:fs";
import { createHash } from "node:crypto";
import type { ExtractedFile, ArchiveEntry } from "@types/install.types";

export interface VerificationResult {
  allValid: boolean;
  filesChecked: number;
  filesValid: number;
  filesInvalid: number;
  errors: VerificationError[];
}

export interface VerificationError {
  file: string;
  type: "size_mismatch" | "crc_mismatch" | "empty_file" | "missing_file" | "corrupted";
  expected: string;
  actual: string;
}

/**
 * Verifica integridade dos arquivos extraídos.
 * Compara tamanho e CRC32 (quando disponível).
 */
export async function verifyExtractedFiles(
  extractedFiles: ExtractedFile[],
  archiveEntries: ArchiveEntry[],
): Promise<VerificationResult> {
  const errors: VerificationError[] = [];
  let filesChecked = 0;
  let filesValid = 0;

  for (const extracted of extractedFiles) {
    filesChecked++;

    // Encontrar entry correspondente no archive
    const archiveEntry = archiveEntries.find(
      (e) =>
        e.path === extracted.relativePath ||
        e.path.replace(/\\/g, "/") === extracted.relativePath,
    );

    if (!archiveEntry) {
      errors.push({
        file: extracted.relativePath,
        type: "missing_file",
        expected: "Present in archive",
        actual: "Not found in archive listing",
      });
      continue;
    }

    // Verificar se arquivo existe
    if (!fs.existsSync(extracted.absolutePath)) {
      errors.push({
        file: extracted.relativePath,
        type: "missing_file",
        expected: `Size: ${archiveEntry.size}`,
        actual: "File not found on disk",
      });
      continue;
    }

    // Verificar tamanho
    const stat = fs.statSync(extracted.absolutePath);
    extracted.actualSize = stat.size;

    if (stat.size === 0) {
      errors.push({
        file: extracted.relativePath,
        type: "empty_file",
        expected: `Size: ${archiveEntry.size}`,
        actual: "Size: 0",
      });
      continue;
    }

    if (archiveEntry.size > 0 && stat.size !== archiveEntry.size) {
      errors.push({
        file: extracted.relativePath,
        type: "size_mismatch",
        expected: `Size: ${archiveEntry.size}`,
        actual: `Size: ${stat.size}`,
      });
      continue;
    }

    // Verificar CRC32 se disponível
    if (archiveEntry.crc32) {
      const actualCrc32 = await computeCrc32(extracted.absolutePath);
      extracted.actualCrc32 = actualCrc32;

      if (actualCrc32.toUpperCase() !== archiveEntry.crc32.toUpperCase()) {
        errors.push({
          file: extracted.relativePath,
          type: "crc_mismatch",
          expected: `CRC32: ${archiveEntry.crc32}`,
          actual: `CRC32: ${actualCrc32}`,
        });
        continue;
      }
    }

    // Arquivo válido
    extracted.verified = true;
    filesValid++;
  }

  return {
    allValid: errors.length === 0,
    filesChecked,
    filesValid,
    filesInvalid: errors.length,
    errors,
  };
}

/**
 * Calcula CRC32 de um arquivo.
 */
async function computeCrc32(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5"); // Fallback: usar md5 se CRC32 não disponível
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
```

### 6. Hook de UI (`ui/hooks/mods/useInstallOrchestrator.ts`)

```typescript
import { useState, useCallback, useEffect, useRef } from "react";
import type {
  InstallStage,
  InstallProgress,
  InstallResult,
  InstallConfig,
} from "../../types/install.types";

export interface UseInstallOrchestratorReturn {
  stage: InstallStage;
  progress: InstallProgress | null;
  result: InstallResult | null;
  isInstalling: boolean;
  canCancel: boolean;
  startInstall: (archivePath: string, config?: Partial<InstallConfig>) => Promise<InstallResult | null>;
  cancel: () => void;
  dismissResult: () => void;
  // Helpers de UI
  stageLabel: string;       // Traduzido
  stagePercent: number;     // 0-100
  elapsedTime: string;      // "01:23"
}

export function useInstallOrchestrator(
  gameId: string,
  profile: string,
  addLog: (msg: string) => void,
  onRefresh: () => void,
): UseInstallOrchestratorReturn {
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

  const startInstall = useCallback(
    async (
      archivePath: string,
      configOverrides?: Partial<InstallConfig>,
    ): Promise<InstallResult | null> => {
      const config: InstallConfig = {
        gameId,
        profile,
        stagingDir: "", // Será determinado pelo backend
        overwriteExisting: false,
        verifyAfterExtract: true,
        maxRetries: 2,
        timeoutMs: 300_000,
        ...configOverrides,
      };

      setStage("reading_archive");
      setResult(null);
      addLog(`Iniciando instalação: ${archivePath.split("/").pop()}`);

      try {
        const installResult = await window.electron.installModOrchestrated(archivePath, config);

        setResult(installResult);

        if (installResult.success) {
          addLog(
            `✅ ${installResult.modName} instalado` +
            ` (${installResult.extractedFiles.length} arquivos,` +
            ` verificado: ${installResult.verified ? "sim" : "não"})`,
          );
          await onRefresh();
        } else {
          addLog(`❌ Falha: ${installResult.error}`);
        }

        return installResult;
      } catch (err) {
        const errorResult: InstallResult = {
          success: false,
          modName: archivePath.split("/").pop()?.replace(/\.\w+$/, "") || "unknown",
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
        addLog(`❌ Erro: ${String(err)}`);
        return errorResult;
      } finally {
        setStage("idle");
      }
    },
    [gameId, profile, addLog, onRefresh],
  );

  const cancel = useCallback(() => {
    window.electron.abortInstall?.();
    setStage("idle");
    setProgress(null);
    addLog("Instalação cancelada");
  }, [addLog]);

  const dismissResult = useCallback(() => {
    setResult(null);
  }, []);

  // Helpers computados
  const isInstalling = stage !== "idle" && stage !== "error" && stage !== "deployed";
  const canCancel = isInstalling && stage !== "saving" && stage !== "ready";

  const stageLabels: Record<InstallStage, string> = {
    idle: "Pronto",
    reading_archive: "Lendo arquivo...",
    extracting: "Extraindo arquivos...",
    verifying: "Verificando integridade...",
    analyzing: "Analisando estrutura...",
    saving: "Salvando...",
    ready: "Concluído",
    deploying: "Instalando no jogo...",
    deployed: "Instalado",
    error: "Erro",
  };

  const stagePercent = progress?.percent ?? (stage === "idle" ? 0 : stage === "ready" || stage === "deployed" ? 100 : 50);

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
```

### 7. Componente de Progresso (`ui/components/InstallProgressOverlay/InstallProgressOverlay.tsx`)

```tsx
import { useTranslation } from "react-i18next";
import type { InstallStage, InstallProgress } from "../../types/install.types";
import "./InstallProgressOverlay.scss";

interface InstallProgressOverlayProps {
  stage: InstallStage;
  progress: InstallProgress | null;
  canCancel: boolean;
  onCancel: () => void;
}

const STAGE_ICONS: Record<InstallStage, string> = {
  idle: "",
  reading_archive: "📖",
  extracting: "📦",
  verifying: "✅",
  analyzing: "🔍",
  saving: "💾",
  ready: "✓",
  deploying: "⚡",
  deployed: "✓",
  error: "❌",
};

export function InstallProgressOverlay({
  stage,
  progress,
  canCancel,
  onCancel,
}: InstallProgressOverlayProps) {
  const { t } = useTranslation("mod_manager");

  if (stage === "idle") return null;

  const percent = progress?.percent ?? 0;
  const modName = progress?.modName || "";
  const currentFile = progress?.currentFile || "";
  const filesProcessed = progress?.filesProcessed ?? 0;
  const filesTotal = progress?.filesTotal ?? 0;

  // Formatar tamanho
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Traduzir stage
  const stageKey = `install_stage_${stage}`;
  const stageLabel = t(stageKey, stage);

  return (
    <div className="install-overlay">
      <div className="install-overlay__box">
        <div className="install-overlay__icon">
          {STAGE_ICONS[stage]}
        </div>

        <p className="install-overlay__title">
          {stage === "ready"
            ? t("install_complete")
            : stage === "error"
              ? t("install_error")
              : t("installing_mod")}
        </p>

        {modName && (
          <p className="install-overlay__modname">{modName}</p>
        )}

        <p className="install-overlay__stage">{stageLabel}</p>

        {currentFile && stage === "extracting" && (
          <p className="install-overlay__file" title={currentFile}>
            {currentFile.length > 40
              ? `...${currentFile.slice(-37)}`
              : currentFile}
          </p>
        )}

        {filesTotal > 0 && (
          <p className="install-overlay__count">
            {filesProcessed} / {filesTotal} {t("files")}
          </p>
        )}

        <div className="install-overlay__bar-track">
          <div
            className={`install-overlay__bar-fill install-overlay__bar-fill--${stage}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="install-overlay__pct">{Math.round(percent)}%</p>

        {stage === "error" && progress?.message && (
          <p className="install-overlay__error">{progress.message}</p>
        )}

        {canCancel && (
          <button className="install-overlay__cancel" onClick={onCancel}>
            {t("cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
```

### 8. Traduções

Adicionar as seguintes chaves em cada arquivo `translation.json`:

#### `en/translation.json`
```json
{
  "mod_manager": {
    "install_stage_idle": "Ready",
    "install_stage_reading_archive": "Reading archive...",
    "install_stage_extracting": "Extracting files...",
    "install_stage_verifying": "Verifying integrity...",
    "install_stage_analyzing": "Analyzing structure...",
    "install_stage_saving": "Saving...",
    "install_stage_ready": "Complete",
    "install_stage_deploying": "Installing to game...",
    "install_stage_deployed": "Installed",
    "install_stage_error": "Error",
    "installing_mod": "Installing mod...",
    "install_complete": "Installation Complete",
    "install_error": "Installation Error",
    "files": "files",
    "verified": "Verified",
    "not_verified": "Not verified",
    "overwrite_title": "Mod Already Installed",
    "overwrite_desc": "Mod \"{{name}}\" is already installed. Do you want to overwrite it?",
    "overwrite_confirm": "Overwrite",
    "archive_info": "Archive Info",
    "archive_files": "{{count}} files ({{size}})",
    "archive_password_protected": "Password protected archive",
    "install_cancelled": "Installation cancelled",
    "verification_passed": "All files verified",
    "verification_failed": "Verification failed: {{count}} errors",
    "size_mismatch": "Size mismatch",
    "crc_mismatch": "Integrity check failed"
  }
}
```

#### `pt-BR/translation.json`
```json
{
  "mod_manager": {
    "install_stage_idle": "Pronto",
    "install_stage_reading_archive": "Lendo arquivo...",
    "install_stage_extracting": "Extraindo arquivos...",
    "install_stage_verifying": "Verificando integridade...",
    "install_stage_analyzing": "Analisando estrutura...",
    "install_stage_saving": "Salvando...",
    "install_stage_ready": "Concluído",
    "install_stage_deploying": "Instalando no jogo...",
    "install_stage_deployed": "Instalado",
    "install_stage_error": "Erro",
    "installing_mod": "Instalando mod...",
    "install_complete": "Instalação Concluída",
    "install_error": "Erro na Instalação",
    "files": "arquivos",
    "verified": "Verificado",
    "not_verified": "Não verificado",
    "overwrite_title": "Mod Já Instalado",
    "overwrite_desc": "O mod \"{{name}}\" já está instalado. Deseja sobrescrevê-lo?",
    "overwrite_confirm": "Sobrescrever",
    "archive_info": "Informações do Arquivo",
    "archive_files": "{{count}} arquivos ({{size}})",
    "archive_password_protected": "Arquivo protegido por senha",
    "install_cancelled": "Instalação cancelada",
    "verification_passed": "Todos os arquivos verificados",
    "verification_failed": "Verificação falhou: {{count}} erros",
    "size_mismatch": "Tamanho incorreto",
    "crc_mismatch": "Falha na verificação de integridade"
  }
}
```

#### `ru/translation.json`
```json
{
  "mod_manager": {
    "install_stage_idle": "Готово",
    "install_stage_reading_archive": "Чтение архива...",
    "install_stage_extracting": "Извлечение файлов...",
    "install_stage_verifying": "Проверка целостности...",
    "install_stage_analyzing": "Анализ структуры...",
    "install_stage_saving": "Сохранение...",
    "install_stage_ready": "Завершено",
    "install_stage_deploying": "Установка в игру...",
    "install_stage_deployed": "Установлено",
    "install_stage_error": "Ошибка",
    "installing_mod": "Установка мода...",
    "install_complete": "Установка завершена",
    "install_error": "Ошибка установки",
    "files": "файлы",
    "verified": "Проверено",
    "not_verified": "Не проверено",
    "overwrite_title": "Мод уже установлен",
    "overwrite_desc": "Мод \"{{name}}\" уже установлен. Хотите перезаписать?",
    "overwrite_confirm": "Перезаписать",
    "archive_info": "Информация об архиве",
    "archive_files": "{{count}} файлов ({{size}})",
    "archive_password_protected": "Архив защищен паролем",
    "install_cancelled": "Установка отменена",
    "verification_passed": "Все файлы проверены",
    "verification_failed": "Проверка не пройдена: {{count}} ошибок",
    "size_mismatch": "Несовпадение размера",
    "crc_mismatch": "Проверка целостности не пройдена"
  }
}
```

#### `zh/translation.json`
```json
{
  "mod_manager": {
    "install_stage_idle": "就绪",
    "install_stage_reading_archive": "读取归档...",
    "install_stage_extracting": "解压文件...",
    "install_stage_verifying": "验证完整性...",
    "install_stage_analyzing": "分析结构...",
    "install_stage_saving": "保存...",
    "install_stage_ready": "完成",
    "install_stage_deploying": "安装到游戏...",
    "install_stage_deployed": "已安装",
    "install_stage_error": "错误",
    "installing_mod": "安装模组...",
    "install_complete": "安装完成",
    "install_error": "安装错误",
    "files": "文件",
    "verified": "已验证",
    "not_verified": "未验证",
    "overwrite_title": "模组已安装",
    "overwrite_desc": "模组 \"{{name}}\" 已安装。是否覆盖？",
    "overwrite_confirm": "覆盖",
    "archive_info": "归档信息",
    "archive_files": "{{count}} 个文件 ({{size}})",
    "archive_password_protected": "归档受密码保护",
    "install_cancelled": "安装已取消",
    "verification_passed": "所有文件已验证",
    "verification_failed": "验证失败：{{count}} 个错误",
    "size_mismatch": "大小不匹配",
    "crc_mismatch": "完整性检查失败"
  }
}
```

### 9. Modificações Necessárias

#### Arquivos a criar:
- `types/install.types.ts` — Tipos compartilhados
- `services/install-orchestrator.ts` — Orquestrador principal
- `services/archive-reader.ts` — Leitura de archive
- `services/archive-extractor.ts` — Extração com progresso
- `services/integrity-checker.ts` — Verificação de integridade
- `ui/hooks/mods/useInstallOrchestrator.ts` — Hook React
- `ui/components/InstallProgressOverlay/InstallProgressOverlay.tsx` — Componente de UI
- `ui/components/InstallProgressOverlay/InstallProgressOverlay.scss` — Estilos

#### Arquivos a modificar:
- `events/mod-deploy.ts` — Adicionar IPC `installModOrchestrated`
- `src/preload/index.ts` — Adicionar bridge `installModOrchestrated`, `onInstallProgress`, `abortInstall`
- `src/renderer/src/declaration.d.ts` — Adicionar tipos
- `ui/ModManager.tsx` — Usar novo hook e componente
- `ui/components/Modals/OverwriteModal/OverwriteModal.tsx` — Usar `t()`
- Todos os `src/locales/*/translation.json` — Adicionar chaves de tradução

### 10. Fluxo Visual

```
┌─────────────────────────────────────────────────────────┐
│                    INSTALANDO MOD                       │
│                                                         │
│  📦 RaceMenu v3-4-5-29624-3-4-5                        │
│                                                         │
│  Extraindo arquivos...                                  │
│  meshes/characters/femalehead.dds                       │
│                                                         │
│  127 / 243 arquivos                                     │
│                                                         │
│  ████████████████████░░░░░░░░░░  52%                    │
│                                                         │
│                          [Cancelar]                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               INSTALAÇÃO CONCLUÍDA                      │
│                                                         │
│  ✓ RaceMenu v3-4-5-29624-3-4-5                         │
│                                                         │
│  243 arquivos extraídos                                 │
│  Todos os arquivos verificados ✓                        │
│  2 plugins (.esp) detectados                            │
│                                                         │
│  Duração: 00:34                                         │
│                                                         │
│                          [OK]                           │
└─────────────────────────────────────────────────────────┘
```

---

## Notas de Implementação

1. **Progresso confiável**: O `7z l -slt` fornece CRC32 e tamanhos sem extrair. O `7z x` com parse de stdout rastreia cada arquivo.

2. **Verificação dupla**: Primeiro compara tamanhos (rápido), depois CRC32 (se disponível). CRC32 é opcional — muitos archives não têm.

3. **Timeout inteligente**: Cada stage tem seu próprio timeout. Extração de arquivo grande pode levar mais tempo.

4. **Abort limpo**: `AbortController` mata o processo 7z e limpa arquivos parciais.

5. **Tradução automática**: O hook `useInstallOrchestrator` usa `t()` do i18n para todos os textos visíveis.

6. **Fallback sem CRC32**: Se o archive não tem CRC32, a verificação usa apenas tamanho. Se nem tamanho tem, marca como "não verificado" mas não falha.

7. **Auto-dismiss**: Quando `stage === "ready"`, o overlay pode fechar automaticamente após 2 segundos (configurável).
