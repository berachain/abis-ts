import { promises as fs } from "node:fs";

import type { AbiConfig } from "./types.ts";

/**
 * Load and validate the ABI generation config from a JSON file.
 *
 * Validates that:
 * - `sources` is a non-empty array.
 * - `outputDir` and `barrelFile` are present.
 * - Each source has exactly one of `repo` or `repoPath` (not both, not neither).
 *
 * Applies defaults for optional fields:
 * - `reposDir` → `".repos"`
 * - `onMissingRepo` → `"error"`
 *
 * @throws on invalid or missing required fields.
 */
export async function loadConfig(configPath: string): Promise<AbiConfig> {
  const content = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(content) as AbiConfig;

  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
    throw new Error("Invalid config: sources must be a non-empty array");
  }
  if (!parsed.outputDir || !parsed.barrelFile) {
    throw new Error("Invalid config: outputDir and barrelFile are required");
  }

  for (const source of parsed.sources) {
    if (!source.repo && !source.repoPath) {
      throw new Error(`Source "${source.id}" must specify either "repo" or "repoPath"`);
    }
    if (source.repo && source.repoPath) {
      throw new Error(`Source "${source.id}" cannot specify both "repo" and "repoPath"`);
    }
  }

  return {
    ...parsed,
    reposDir: parsed.reposDir ?? ".repos",
    onMissingRepo: parsed.onMissingRepo ?? "error",
  };
}
