import { formatAbiItem, parseAbi } from "abitype";
import { describe, expect, it } from "vitest";

import { parseAbiFromModuleContent } from "./changelog";

import { artifactToModule, dedupeAndValidateModules } from "./modules";

const artifact = (overrides: Partial<Parameters<typeof artifactToModule>[0]> = {}) => ({
  sourceId: "contracts",
  filePath: "/repo/out/Token.sol/Token.json",
  contractName: "Token",
  relDir: ".",
  abi: [] as unknown[],
  ...overrides,
});

describe("artifactToModule", () => {
  it("generates camelCase export name with Abi suffix", () => {
    const mod = artifactToModule(artifact({ contractName: "RewardVault" }));
    expect(mod.exportName).toBe("rewardVaultAbi");
  });

  it("outputs at top level when source matches mainSource", () => {
    const mod = artifactToModule(
      artifact({ contractName: "RewardVault", relDir: "pol/rewards" }),
      "contracts",
    );
    expect(mod.moduleRelPath).toBe("pol/rewards/rewardVault.ts");
  });

  it("prefixes output path for non-main sources", () => {
    const mod = artifactToModule(artifact({ sourceId: "governance", contractName: "Governor" }));
    expect(mod.moduleRelPath).toBe("governance/governor.ts");
  });

  it("prefixes output path when no mainSource is set", () => {
    const mod = artifactToModule(artifact({ contractName: "WBERA", relDir: "." }));
    expect(mod.moduleRelPath).toBe("contracts/wbera.ts");
  });

  it("handles root-level contracts with mainSource (relDir = '.')", () => {
    const mod = artifactToModule(artifact({ contractName: "WBERA", relDir: "." }), "contracts");
    expect(mod.exportName).toBe("wberaAbi");
    expect(mod.moduleRelPath).toBe("wbera.ts");
  });

  it("generates module content with named and default exports", () => {
    const mod = artifactToModule(artifact({ abi: [{ type: "function", name: "name" }] }));
    expect(mod.moduleContent).toContain("export const tokenAbi =");
    expect(mod.moduleContent).toContain("as const;");
    expect(mod.moduleContent).toContain("export default tokenAbi;");
  });

  it("sets dedupeKey as sourceId:contractName", () => {
    const mod = artifactToModule(artifact({ sourceId: "mySource", contractName: "MyContract" }));
    expect(mod.dedupeKey).toBe("mySource:MyContract");
  });
});

describe("dedupeAndValidateModules", () => {
  const abi = [{ type: "function", name: "name", inputs: [], outputs: [], stateMutability: "view" }];

  it("dedupes same key with identical content (warning)", () => {
    const one = artifactToModule(artifact({ filePath: "a", relDir: "tokens", abi }));
    const two = artifactToModule(artifact({ filePath: "b", relDir: "tokens", abi }));

    const result = dedupeAndValidateModules([two, one]);
    expect(result.modules).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Duplicate ABI ignored");
  });

  it("throws on same key with different content", () => {
    const one = artifactToModule(artifact({ filePath: "a", relDir: "tokens", abi }));
    const two = artifactToModule(
      artifact({
        filePath: "b",
        relDir: "tokens",
        abi: [{ type: "function", name: "symbol", inputs: [], outputs: [], stateMutability: "view" }],
      }),
    );

    expect(() => dedupeAndValidateModules([one, two])).toThrow(/ABI collision/);
  });

  it("allows same contract name across different sources", () => {
    const one = artifactToModule(artifact({ sourceId: "source1", abi }), "source1");
    const two = artifactToModule(artifact({ sourceId: "source2", abi }));

    const result = dedupeAndValidateModules([one, two]);
    expect(result.modules).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns modules sorted by sourceId then contractName", () => {
    const mod = (sourceId: string, name: string) =>
      artifactToModule(artifact({ sourceId, contractName: name }));

    const result = dedupeAndValidateModules([mod("z", "Alpha"), mod("a", "Beta"), mod("a", "Alpha")]);

    expect(result.modules.map((m) => `${m.sourceId}:${m.contractName}`)).toEqual([
      "a:Alpha",
      "a:Beta",
      "z:Alpha",
    ]);
  });
});

describe("BeraChef rollout compatibility", () => {
  const legacy = parseAbi([
    "function rewardAllocationInactivityBlockSpan() view returns (uint64)",
    "function isValExemptedFromInactivity(bytes valPubkey) view returns (bool isExemptedFromInactivity)",
    "function setValInactivityExemption(bytes valPubkey, bool isExempted)",
    "event ValInactivityExemptionSet(bytes indexed valPubkey, bool isExempted)",
    "error CannotRecoverRewardToken()",
  ]);
  const upgraded = parseAbi([
    "function rewardAllocationInactivityBlockSpan() view returns (uint64)",
    "function isValidatorExemptFromBaselineOverride(bytes valPubkey) view returns (bool isExempted)",
    "function isActiveIncentiveVault(address vault) view returns (bool)",
    "function setValBaselineOverrideExemption(bytes valPubkey, bool isExempted)",
    "event ValBaselineOverrideExemptionSet(bytes indexed valPubkey, bool isExempted)",
    "error IncentiveRateTooLow()",
  ]);

  it.each([{ abi: legacy }, { abi: upgraded }])("keeps both deployed interfaces in the existing export", ({
    abi,
  }) => {
    const mod = artifactToModule(
      artifact({ contractName: "BeraChef", relDir: "pol/rewards", abi }),
      "contracts",
    );
    const generated = parseAbiFromModuleContent(mod.moduleContent);
    expect(mod.moduleRelPath).toBe("pol/rewards/beraChef.ts");
    if (!generated) throw new Error("Generated ABI is missing");
    const signatures = generated.map(formatAbiItem);
    for (const item of [...legacy, ...upgraded]) {
      expect(signatures).toContain(formatAbiItem(item));
    }
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(generated).toEqual(expect.arrayContaining([...abi]));
  });

  it("does not add rollout entries to other contracts or sources", () => {
    for (const overrides of [
      { contractName: "RewardVault", relDir: "pol/rewards" },
      { sourceId: "other", contractName: "BeraChef", relDir: "pol/rewards" },
      { contractName: "BeraChef", relDir: "old_versions" },
    ]) {
      const mod = artifactToModule(artifact({ ...overrides, abi: legacy }), "contracts");
      expect(parseAbiFromModuleContent(mod.moduleContent)).toEqual(legacy);
    }
  });

  it("rejects incompatible definitions instead of publishing ambiguous overloads", () => {
    const abi = parseAbi(["function isActiveIncentiveVault(address vault) view returns (uint256)"]);
    expect(() =>
      artifactToModule(artifact({ contractName: "BeraChef", relDir: "pol/rewards", abi }), "contracts"),
    ).toThrow(/incompatible.*isActiveIncentiveVault/i);
  });
});
