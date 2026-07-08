/**
 * install-resolver.ts — Resolvedor de plano de instalação
 *
 * Examina os arquivos extraídos e define o destino de cada um
 * baseado em regras de roteamento específicas do jogo.
 */

import fs from "node:fs";
import path from "node:path";
import type { CustomRule } from "../../games/_shared/types";
import type { InstallPlan, PlanFileEntry } from "../../types/install.types";
import { detectStripPrefix, applyStripPrefix } from "./strip-prefix";

function walkDir(dir: string, base: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(full, base));
      } else {
        files.push(path.relative(base, full));
      }
    }
  } catch {
    // skip if directory was deleted during walk
  }
  return files;
}

function matchRule(fileRel: string, rule: CustomRule): boolean {
  const basename = path.basename(fileRel);
  const ext = path.extname(fileRel).toLowerCase();
  const dirs = fileRel.split("/").slice(0, -1);

  if (rule.filenames) {
    const matched = rule.filenames.some((pattern) => {
      if (pattern.includes("*")) {
        const re = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
        return re.test(basename);
      }
      return basename === pattern;
    });
    if (!matched) return false;
  }

  if (rule.extensions) {
    if (!rule.extensions.includes(ext)) return false;
  }

  if (rule.folders) {
    const hasFolder = dirs.some((d) => rule.folders!.includes(d));
    if (!hasFolder) return false;
  }

  return true;
}

function flattenFiles(
  files: string[],
  extensions: string[],
  targetDir: string,
): string[] {
  return files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return extensions.includes(ext);
  });
}

function detectPlugins(
  files: string[],
  pluginExtensions: string[],
): string[] {
  return files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return pluginExtensions.includes(ext);
  });
}

function detectArchives(files: string[]): string[] {
  const archiveExts = [".bsa", ".ba2"];
  return files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return archiveExts.includes(ext);
  });
}

export function resolveInstallPlan(
  targetDir: string,
  gameId: string,
  modName: string,
  getStripPrefixes: () => string[],
  _getDeployTarget: (gamePath: string) => string,
  getCustomRoutingRules?: () => CustomRule[],
  getPluginExtensions?: () => string[],
  getRequiredFolders?: () => string[],
  getFlattenExtensions?: () => string[],
): InstallPlan {
  const filesToInstall: PlanFileEntry[] = [];
  const pluginExtensions = getPluginExtensions?.() ?? [".esp", ".esm", ".esl"];

  // 1. Listar todos os arquivos extraídos
  const allRelFiles = walkDir(targetDir, targetDir);

  // 2. Detectar strip prefix
  const requiredFolders = getRequiredFolders?.() ?? [];
  const knownPrefixes = getStripPrefixes();
  const stripResult = detectStripPrefix(targetDir, requiredFolders, knownPrefixes);

  // 3. Aplicar strip prefix se detectado
  let mappedFiles = allRelFiles.map((f) => ({ relPath: f, relKey: f.toLowerCase() }));
  if (stripResult.detectedPrefix) {
    mappedFiles = applyStripPrefix(mappedFiles, stripResult.detectedPrefix);
  }

  // 4. Aplicar flatten extensions se houver
  const flattenExtensions = getFlattenExtensions?.() ?? [];
  const flattenSet = new Set(flattenExtensions);

  // 5. Aplicar regras de roteamento customizadas
  const customRules = getCustomRoutingRules?.() ?? [];
  const routedFiles = new Set<string>();
  const isWinGame = ["skyrim", "fallout", "oblivion", "enderal", "morrowind", "starfield"].some(
    (prefix) => gameId.startsWith(prefix),
  );

  for (const rule of customRules) {
    for (const file of mappedFiles) {
      if (routedFiles.has(file.relPath)) continue;
      if (!matchRule(file.relKey, rule)) continue;

      let dest: string;
      if (rule.dest === "") {
        dest = file.relPath;
      } else {
        dest = path.join(rule.dest, path.basename(file.relPath));
        if (rule.flatten && file.relPath.includes("/")) {
          dest = path.join(rule.dest, path.basename(file.relPath));
        }
      }

      // Se tem mirrorDests, criar entradas adicionais
      if (rule.mirrorDests) {
        for (const mirror of rule.mirrorDests) {
          filesToInstall.push({
            source: path.join(targetDir, file.relPath),
            destination: path.join(mirror, path.basename(file.relPath)),
            action: "copy",
            reason: `mirror: ${mirror}`,
          });
        }
      }

      filesToInstall.push({
        source: path.join(targetDir, file.relPath),
        destination: dest,
        action: "copy",
        reason: rule.toPrefix ? "prefix" : "game",
      });
      routedFiles.add(file.relPath);
    }
  }

  // 6. Arquivos não roteados: mapear baseado em estrutura comum
  for (const file of mappedFiles) {
    if (routedFiles.has(file.relPath)) continue;

    let destination: string;
    let reason = "game";

    // Flatten se extensão está na lista
    if (flattenSet.has(path.extname(file.relKey)) || flattenSet.has(file.relKey)) {
      destination = path.basename(file.relPath);
      reason = "flatten";
    } else if (isWinGame && !file.relKey.startsWith("data/")) {
      destination = path.join("Data", file.relPath);
      reason = "data";
    } else {
      destination = file.relPath;
    }

    filesToInstall.push({
      source: path.join(targetDir, file.relPath),
      destination,
      action: "copy",
      reason,
    });
  }

  // 7. Detectar plugins e archives
  const effectiveFiles = mappedFiles.map((f) => f.relPath);
  const plugins = detectPlugins(effectiveFiles, pluginExtensions);
  const archives = detectArchives(effectiveFiles);

  // 8. Determinar estrutura do mod
  const hasFomod = fs.existsSync(path.join(targetDir, "fomod", "ModuleConfig.xml")) ||
                   fs.existsSync(path.join(targetDir, "Fomod", "ModuleConfig.xml")) ||
                   fs.existsSync(path.join(targetDir, "FOMOD", "ModuleConfig.xml"));

  const hasData = effectiveFiles.some((f) => f.toLowerCase().startsWith("data/")) ||
                  effectiveFiles.some((f) => {
                    const ext = path.extname(f).toLowerCase();
                    return [".pex", ".dds", ".nif", ".wav", ".xwm"].includes(ext);
                  });

  const wrapperLevels = stripResult.detectedPrefix ? 1 : 0;

  return {
    modName,
    filesToInstall,
    structure: {
      category: hasFomod ? "fomod" : "standard",
      hasFomod,
      hasData,
      wrapperLevels,
      plugins,
      archives,
    },
  };
}
