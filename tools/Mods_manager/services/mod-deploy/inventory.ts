import path from "node:path";
import fs from "node:fs";
import type { ModFileEntry, ModInventory } from "@types";
import { SE_REGEXES } from "../../games/_shared/bethesda-constants";
import { walkDirWithDirs } from "../../games/_shared/filemap";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"]);
const README_EXTS = new Set([".txt", ".md", ".htm", ".html"]);
const README_PATTERNS = ["readme", "leia", "install", "instruç", "instruc", "about", "descriç", "descric", "info"];

export function detectModType(stagingDir: string): {
  hasFomod: boolean;
  plugins: string[];
  hasSkse: boolean;
} {
  const plugins: string[] = [];
  let hasFomod = false;
  let hasSkse = false;

  walkDirWithDirs(stagingDir, {
    onFile: (fullPath) => {
      const lower = path.basename(fullPath).toLowerCase();
      if (lower.endsWith(".esp") || lower.endsWith(".esm") || lower.endsWith(".esl")) {
        plugins.push(path.basename(fullPath));
      }
      if (lower.startsWith("skse") && lower.endsWith(".dll")) {
        hasSkse = true;
      }
    },
    onDir: (_fullPath, _relativePath, dirName) => {
      if (dirName.toLowerCase() === "fomod") {
        hasFomod = true;
      }
    },
  });

  return { hasFomod, plugins, hasSkse };
}

export function inventoryMod(stagingDir: string, modName: string): ModInventory {
  const files: ModFileEntry[] = [];
  const scriptExtenderFiles: ModFileEntry[] = [];
  const pluginFiles: string[] = [];
  const previewFiles: ModFileEntry[] = [];
  const readmeFiles: ModFileEntry[] = [];
  let hasFomod = false;

  walkDirWithDirs(stagingDir, {
    onFile: (fullPath, relativePath) => {
      const lowerName = path.basename(fullPath).toLowerCase();
      const ext = path.extname(lowerName);
      const nameNoExt = path.basename(lowerName, ext);
      const parts = relativePath.split(path.sep);
      const isRoot = parts.length === 1;

      const isSE = isRoot
        && SE_REGEXES.some(p => p.test(lowerName))
        && (lowerName.endsWith(".exe") || lowerName.endsWith(".dll"));

      const fe: ModFileEntry = {
        relativePath,
        relativePathLower: relativePath.toLowerCase(),
        size: fs.statSync(fullPath).size,
        isScriptExtender: isSE,
        isPlugin: /\.(esp|esm|esl)$/i.test(lowerName),
      };
      files.push(fe);
      if (isSE) scriptExtenderFiles.push(fe);
      if (fe.isPlugin) pluginFiles.push(path.basename(fullPath));

      if (IMAGE_EXTS.has(ext)) {
        previewFiles.push(fe);
      }

      if (README_EXTS.has(ext)) {
        const dirName = parts[0]?.toLowerCase() || "";
        if (README_PATTERNS.some(p => nameNoExt.includes(p)) || README_PATTERNS.some(p => dirName.includes(p))) {
          readmeFiles.push(fe);
        }
      }
    },
    onDir: (_fullPath, _relativePath, dirName) => {
      if (dirName.toLowerCase() === "fomod") hasFomod = true;
    },
  });

  return { modName, files, scriptExtenderFiles, pluginFiles, hasFomod, previewFiles, readmeFiles };
}
