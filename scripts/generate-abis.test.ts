import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { generateAbis } from "./generate-abis.ts";

const tempDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("generateAbis integration", () => {
  it("generates modules preserving directory structure", async () => {
    const tmpRepo = await makeTempDir("abi-gen-repo-");
    const sourceRepoOne = path.resolve("test/fixtures/mock-source-artifacts");
    const sourceRepoTwo = path.resolve("test/fixtures/mock-source-two");

    const configPath = path.join(tmpRepo, "abi.config.json");

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: path.join(tmpRepo, "src/generated/abi"),
          barrelFile: path.join(tmpRepo, "src/generated/abi/exports.ts"),
          onMissingRepo: "error",
          sources: [
            {
              id: "mock",
              repoPath: sourceRepoOne,
              buildCommand: "echo skip",
            },
            {
              id: "mock2",
              repoPath: sourceRepoTwo,
              buildCommand: "echo skip",
            },
          ],
        },
        null,
        2,
      ),
    );

    const originalCwd = process.cwd();
    process.chdir(tmpRepo);
    try {
      const result = await generateAbis({ configPath, runBuild: false });
      expect(result.moduleCount).toBe(2);
      expect(result.warnings.some((w: string) => w.includes("Skipping artifact without ABI"))).toBe(true);

      const barrel = await fs.readFile(path.join(tmpRepo, "src/generated/abi/exports.ts"), "utf8");
      const tokenModuleOne = await fs.readFile(
        path.join(tmpRepo, "src/generated/abi/mock/tokens/token.ts"),
        "utf8",
      );
      const tokenModuleTwo = await fs.readFile(
        path.join(tmpRepo, "src/generated/abi/mock2/tokens/token.ts"),
        "utf8",
      );

      expect(barrel).toContain('export * from "./mock/tokens/token.js"');
      expect(barrel).toContain('export * from "./mock2/tokens/token.js"');
      expect(tokenModuleOne).toContain("export const tokenAbi");
      expect(tokenModuleOne).toContain("as const;");
      expect(tokenModuleTwo).toContain("export const tokenAbi");
      expect(tokenModuleTwo).toContain("as const;");
    } finally {
      process.chdir(originalCwd);
    }
  });
});
