import fs from "node:fs";
import path from "node:path";
import { parseFomodXml, resolveFomodFiles } from "./fomod-parser";
import type { FomodConfig } from "./fomod-types";

export class FomodService {
  /** Find the ModuleConfig.xml in a mod's staging directory. */
  static findConfig(stagingDir: string): string | null {
    let fomodDir = path.join(stagingDir, "fomod");
    if (!fs.existsSync(fomodDir)) {
      fomodDir = path.join(stagingDir, "Fomod");
      if (!fs.existsSync(fomodDir)) return null;
    }

    const candidates = [
      path.join(fomodDir, "ModuleConfig.xml"),
      path.join(fomodDir, "moduleconfig.xml"),
      path.join(fomodDir, "ModuleConfig.Xml"),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }

    const entries = fs.readdirSync(fomodDir);
    for (const e of entries) {
      if (e.toLowerCase().endsWith(".xml")) {
        return path.join(fomodDir, e);
      }
    }

    return null;
  }

  static parse(stagingDir: string): FomodConfig | null {
    const xmlPath = this.findConfig(stagingDir);
    if (!xmlPath) return null;
    return parseFomodXml(xmlPath);
  }

  static async install(
    stagingDir: string,
    targetDir: string,
    selections: Record<string, string[]>
  ): Promise<{ success: boolean; log: string[]; filesCopied: number }> {
    const log: string[] = [];
    const config = this.parse(stagingDir);
    if (!config) {
      return { success: false, log: ["No FOMOD config found"], filesCopied: 0 };
    }

    const pairs = resolveFomodFiles(config, selections);
    log.push(`Resolved ${pairs.length} file pairs from FOMOD selection`);

    let filesCopied = 0;
    const copied: string[] = [];

    try {
      for (const pair of pairs) {
        const sourcePath = path.join(stagingDir, pair.source);

        if (!fs.existsSync(sourcePath)) {
          log.push(`Source not found: ${pair.source}`);
          continue;
        }

        const isDir = fs.statSync(sourcePath).isDirectory();
        // <file destination=""> → preserve source path (destination = source)
        // <folder destination=""> → copy CONTENTS to target root (keep empty)
        const effectiveDest = pair.destination || (isDir ? "" : pair.source);
        const destPath = path.join(targetDir, effectiveDest);

        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        if (isDir) {
          this.copyRecursive(sourcePath, destPath, copied);
        } else {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          fs.copyFileSync(sourcePath, destPath);
          copied.push(destPath);
          filesCopied++;
        }
      }

      log.push(`Copied ${filesCopied} files from FOMOD selections`);

      // Clean up non-selected files — use the coped file paths to know
      // which top-level entries to keep (fomod/ + selected destinations)
      const removed = this.cleanupNonSelected(stagingDir, copied);
      log.push(`Cleaned up ${removed} non-selected files/directories`);

      return { success: true, log, filesCopied };
    } catch (err) {
      log.push(`FOMOD install failed: ${String(err)}. Rolling back...`);
      for (const filePath of copied) {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch { /* skip */ }
      }
      log.push(`Rolled back ${copied.length} files`);
      return { success: false, log, filesCopied };
    }
  }

  /** Remove files and directories not part of the resolved FOMOD selection.
   *  Only `fomod/` directory and paths in `copiedFiles` are kept. */
  static cleanupNonSelected(
    stagingDir: string,
    copiedFiles: string[],
  ): number {
    const keep = new Set<string>();
    keep.add("fomod");

    for (const filePath of copiedFiles) {
      const relPath = path.relative(stagingDir, filePath);
      const parts = relPath.split(/[/\\]/);
      for (let i = 0; i < parts.length; i++) {
        keep.add(parts.slice(0, i + 1).join("/"));
      }
    }

    let removed = 0;
    const entries = fs.readdirSync(stagingDir, { withFileTypes: true });
    for (const entry of entries) {
      if (keep.has(entry.name)) continue;
      const fullPath = path.join(stagingDir, entry.name);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        removed++;
      } catch { /* skip */ }
    }

    return removed;
  }

  private static copyRecursive(src: string, dest: string, copied: string[]): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyRecursive(s, d, copied);
      } else {
        if (fs.existsSync(d)) fs.unlinkSync(d);
        fs.copyFileSync(s, d);
        copied.push(d);
      }
    }
  }
}
