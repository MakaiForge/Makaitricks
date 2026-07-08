import type { FetchReadmeParams, FetchReadmeResult } from "./types";

export async function fetchReadme(
  params: FetchReadmeParams
): Promise<FetchReadmeResult> {
  try {
    const { repoUrl } = params;

    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (!match) {
      return { success: false, error: "Invalid GitHub URL" };
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");

    const readmeUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/README.md`;

    const response = await fetch(readmeUrl, {
      headers: {
        "User-Agent": "Makai-forger",
      },
    });

    if (!response.ok) {
      const fallbackUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@master/README.md`;
      const fallback = await fetch(fallbackUrl, {
        headers: { "User-Agent": "Makai-forger" },
      });

      if (!fallback.ok) {
        return { success: false, error: "README not found" };
      }

      const content = await fallback.text();
      return { success: true, content: content.slice(0, 15000) };
    }

    const content = await response.text();
    return { success: true, content: content.slice(0, 15000) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
