import { describe, expect, it } from "vitest";

import { artifactToModule, dedupeAndValidateModules } from "./modules.ts";

describe("artifactToModule", () => {
  it("generates camelCase export name with Abi suffix", () => {
    const mod = artifactToModule({
      sourceId: "contracts",
      filePath: "/repo/out/RewardVault.sol/RewardVault.json",
      contractName: "RewardVault",
      relDir: "pol/rewards",
      abi: [],
    });

    expect(mod.exportName).toBe("rewardVaultAbi");
  });

  it("preserves directory structure with source id prefix", () => {
    const mod = artifactToModule({
      sourceId: "contracts",
      filePath: "/repo/out/RewardVault.sol/RewardVault.json",
      contractName: "RewardVault",
      relDir: "pol/rewards",
      abi: [],
    });

    expect(mod.moduleRelPath).toBe("contracts/pol/rewards/rewardVault.ts");
  });

  it("handles root-level contracts (relDir = '.')", () => {
    const mod = artifactToModule({
      sourceId: "contracts",
      filePath: "/repo/out/WBERA.sol/WBERA.json",
      contractName: "WBERA",
      relDir: ".",
      abi: [],
    });

    expect(mod.exportName).toBe("wberaAbi");
    expect(mod.moduleRelPath).toBe("contracts/wbera.ts");
  });

  it("generates module content with 'as const'", () => {
    const mod = artifactToModule({
      sourceId: "contracts",
      filePath: "a",
      contractName: "Token",
      relDir: ".",
      abi: [{ type: "function", name: "name" }],
    });

    expect(mod.moduleContent).toContain("export const tokenAbi =");
    expect(mod.moduleContent).toContain("as const;");
  });

  it("sets dedupeKey as sourceId:contractName", () => {
    const mod = artifactToModule({
      sourceId: "mySource",
      filePath: "a",
      contractName: "MyContract",
      relDir: ".",
      abi: [],
    });

    expect(mod.dedupeKey).toBe("mySource:MyContract");
  });
});

describe("dedupeAndValidateModules", () => {
  it("dedupes same key with identical content (warning)", () => {
    const abi = [{ type: "function", name: "name", inputs: [], outputs: [], stateMutability: "view" }];
    const one = artifactToModule({
      sourceId: "contracts",
      filePath: "a",
      contractName: "Token",
      relDir: "tokens",
      abi,
    });
    const two = artifactToModule({
      sourceId: "contracts",
      filePath: "b",
      contractName: "Token",
      relDir: "tokens",
      abi,
    });

    const result = dedupeAndValidateModules([two, one]);
    expect(result.modules).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Duplicate ABI ignored");
  });

  it("throws on same key with different content", () => {
    const one = artifactToModule({
      sourceId: "contracts",
      filePath: "a",
      contractName: "Token",
      relDir: "tokens",
      abi: [{ type: "function", name: "name", inputs: [], outputs: [], stateMutability: "view" }],
    });
    const two = artifactToModule({
      sourceId: "contracts",
      filePath: "b",
      contractName: "Token",
      relDir: "tokens",
      abi: [{ type: "function", name: "symbol", inputs: [], outputs: [], stateMutability: "view" }],
    });

    expect(() => dedupeAndValidateModules([one, two])).toThrow(/ABI collision/);
  });

  it("allows same contract name across different sources", () => {
    const abi = [{ type: "function", name: "name" }];
    const one = artifactToModule({
      sourceId: "source1",
      filePath: "a",
      contractName: "Token",
      relDir: ".",
      abi,
    });
    const two = artifactToModule({
      sourceId: "source2",
      filePath: "b",
      contractName: "Token",
      relDir: ".",
      abi,
    });

    const result = dedupeAndValidateModules([one, two]);
    expect(result.modules).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns modules sorted by sourceId then contractName", () => {
    const mod = (sourceId: string, name: string) =>
      artifactToModule({ sourceId, filePath: "a", contractName: name, relDir: ".", abi: [] });

    const result = dedupeAndValidateModules([mod("z", "Alpha"), mod("a", "Beta"), mod("a", "Alpha")]);

    expect(result.modules.map((m) => `${m.sourceId}:${m.contractName}`)).toEqual([
      "a:Alpha",
      "a:Beta",
      "z:Alpha",
    ]);
  });
});
