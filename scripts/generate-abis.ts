import path from "node:path";

import { loadConfig } from "./lib/config";
import { discoverArtifacts, matchesAny } from "./lib/discovery";
import { ensureRepo } from "./lib/git";
import { artifactToModule, dedupeAndValidateModules } from "./lib/modules";
import { splitWords, toCamelCase, toKebabCase, toPascalCase } from "./lib/naming";
import type { DiscoveredArtifact, GenerateOptions } from "./lib/types";
import { stableStringify } from "./lib/utils";
import { writeGeneratedFiles } from "./lib/writer";

// Re-export everything for tests and external consumers.
export { loadConfig } from "./lib/config";
export { discoverArtifacts, extractArtifact } from "./lib/discovery";
export { ensureRepo, injectAuthToken, resolveRepoUrl } from "./lib/git";
export { artifactToModule, dedupeAndValidateModules } from "./lib/modules";
export type * from "./lib/types";
export { writeGeneratedFiles } from "./lib/writer";

/**
 * Main orchestrator: load config, clone/update repos, discover artifacts,
 * generate TypeScript modules, and write them to disk.
 *
 * Steps:
 * 1. Load and validate `abi.config.json`.
 * 2. For each source, ensure the repo is available locally (clone or update).
 * 3. Discover Foundry artifacts by walking the source's `srcDir`.
 * 4. Convert artifacts to TypeScript module descriptors.
 * 5. Deduplicate and validate (detect ABI collisions).
 * 6. Write generated `.ts` files and the barrel re-export file.
 */
export async function generateAbis(options: GenerateOptions = {}): Promise<{
  moduleCount: number;
  artifactCount: number;
  warnings: string[];
}> {
  const configPath = path.resolve(options.configPath ?? "abi.config.json");
  const config = await loadConfig(configPath);
  const reposDir = config.reposDir ?? ".repos";

  const allArtifacts: DiscoveredArtifact[] = [];
  const warnings: string[] = [];

  for (const source of config.sources) {
    let resolvedPath: string;
    try {
      resolvedPath = await ensureRepo(source, reposDir);
    } catch (err) {
      const message = `Failed to resolve repo for source "${source.id}": ${err instanceof Error ? err.message : err}`;
      if (config.onMissingRepo === "warn") {
        warnings.push(message);
        continue;
      }
      throw new Error(message);
    }

    const discovered = await discoverArtifacts(
      source,
      resolvedPath,
      options.runBuild ?? true,
      config.onMissingRepo ?? "error",
    );
    allArtifacts.push(...discovered.artifacts);
    warnings.push(...discovered.warnings);
  }

  const modules = allArtifacts.map(artifactToModule);
  const deduped = dedupeAndValidateModules(modules);
  warnings.push(...deduped.warnings);

  await writeGeneratedFiles(config, deduped.modules);

  return {
    moduleCount: deduped.modules.length,
    artifactCount: allArtifacts.length,
    warnings,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateAbis()
    .then((result) => {
      for (const warning of result.warnings) {
        console.warn(`[abi:generate] ${warning}`);
      }
      console.log(
        `[abi:generate] Generated ${result.moduleCount} modules from ${result.artifactCount} artifacts`,
      );
    })
    .catch((error) => {
      console.error("[abi:generate] Failed:", error);
      process.exitCode = 1;
    });
}

export const __testUtils = {
  stableStringify,
  toCamelCase,
  toPascalCase,
  toKebabCase,
  matchesAny,
  splitWords,
};
