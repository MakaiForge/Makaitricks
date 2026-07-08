/**
 * file-copier.ts — Cópia de arquivos do staging para o jogo
 */

import fs from "node:fs";
import path from "node:path";
import type { PlanFileEntry, CopyResult } from "../../types/install.types";

type CopyProgressCallback = (current: number, total: number, currentFile: string) => void;

export async function copyFiles(
  files: PlanFileEntry[],
  stagingDir: string,
  targetDir: string,
  onProgress?: CopyProgressCallback,
): Promise<CopyResult> {
  const errors: { file: string; error: string }[] = [];
  let filesCopied = 0;

  for (let i = 0; i < files.length; i++) {
    const entry = files[i];
    const destPath = path.join(targetDir, entry.destination);

    try {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(entry.source, destPath);
      filesCopied++;
    } catch (err) {
      errors.push({ file: entry.source, error: String(err) });
    }

    onProgress?.(i + 1, files.length, entry.source);
  }

  return {
    success: errors.length === 0,
    filesCopied,
    filesFailed: errors.length,
    errors,
  };
}
