import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { logger } from "@main/services";
import { isGogGame } from "@mods/services/gog-detection";

interface SkseRelease {
  version: string;
  url: string;
  gogUrl?: string;
  loader: string;
}

const SKSE_RELEASES: Record<string, SkseRelease> = {
  skyrim: { version: "1_07_03", url: "https://skse.silverlock.org/beta/skse_1_07_03.7z", loader: "skse_loader.exe" },
  skyrim_se: {
    version: "2_02_06",
    url: "https://skse.silverlock.org/beta/skse64_2_02_06.7z",
    gogUrl: "https://skse.silverlock.org/beta/skse64_2_02_06_gog.7z",
    loader: "skse64_loader.exe",
  },
  skyrim_vr: { version: "2_02_06", url: "https://skse.silverlock.org/beta/skse64_2_02_06.7z", loader: "skse64_loader.exe" },
};

function resolveSkseUrl(gameId: string, gamePath: string): string | null {
  const release = SKSE_RELEASES[gameId.toLowerCase()];
  if (!release) return null;
  if (release.gogUrl && isGogGame(gamePath)) return release.gogUrl;
  return release.url;
}

export function isSkseAvailable(gameId: string): boolean {
  return gameId.toLowerCase() in SKSE_RELEASES;
}

export function verifySkse(gamePath: string, gameId: string): boolean {
  const release = SKSE_RELEASES[gameId.toLowerCase()];
  if (!release) return false;
  return fs.existsSync(path.join(gamePath, release.loader));
}

export function getSkseSource(gamePath: string): "steam" | "gog" {
  return isGogGame(gamePath) ? "gog" : "steam";
}

export async function downloadSkse(gameId: string, gamePath: string): Promise<boolean> {
  const release = SKSE_RELEASES[gameId.toLowerCase()];
  if (!release) return false;
  const url = resolveSkseUrl(gameId, gamePath);
  if (!url) return false;
  const loaderPath = path.join(gamePath, release.loader);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skse-"));
  const archivePath = path.join(tmpDir, "skse.7z");
  try {
    execSync(`curl -sL "${url}" -o "${archivePath}"`, { stdio: "pipe", timeout: 60000 });
    execSync(`7z x "${archivePath}" -o"${tmpDir}" -y`, { stdio: "pipe", timeout: 30000 });
    const entries = fs.readdirSync(tmpDir);
    const extractedFolder = entries.find(e => e.startsWith("skse") && fs.statSync(path.join(tmpDir, e)).isDirectory());
    const srcDir = extractedFolder ? path.join(tmpDir, extractedFolder) : tmpDir;
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
      fs.cpSync(path.join(srcDir, file), path.join(gamePath, file), { recursive: true, force: true });
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return fs.existsSync(loaderPath);
  } catch (err) {
    logger.error("SKSE download failed", err);
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    return false;
  }
}
