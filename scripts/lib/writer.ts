import { promises as fs } from "node:fs";
import path from "node:path";

import type { AbiConfig, GeneratedModule } from "./types.ts";

/**
 * Write all generated TypeScript modules and the barrel file to disk.
 *
 * Steps:
 * 1. Clean the output directory (full `rm -rf` + recreate).
 * 2. Create all necessary subdirectories in parallel.
 * 3. Write each module file with its `export const …Abi = … as const` content.
 * 4. Write the barrel file that re-exports all modules using `.js` extensions
 *    (required for TypeScript `NodeNext` module resolution).
 */
export async function writeGeneratedFiles(config: AbiConfig, modules: GeneratedModule[]): Promise<void> {
  await fs.rm(config.outputDir, { recursive: true, force: true });
  await fs.mkdir(config.outputDir, { recursive: true });

  const dirs = new Set(modules.map((mod) => path.join(config.outputDir, path.dirname(mod.moduleRelPath))));
  await Promise.all([...dirs].map((dir) => fs.mkdir(dir, { recursive: true })));

  for (const mod of modules) {
    const absPath = path.join(config.outputDir, mod.moduleRelPath);
    await fs.writeFile(absPath, mod.moduleContent, "utf8");
  }

  const barrelLines = modules.map((mod) => {
    const withJsExt = `./${mod.moduleRelPath.replace(/\.ts$/, ".js")}`;
    return `export * from ${JSON.stringify(withJsExt)};`;
  });

  await fs.mkdir(path.dirname(config.barrelFile), { recursive: true });
  await fs.writeFile(config.barrelFile, `${barrelLines.join("\n")}\n`, "utf8");
}
