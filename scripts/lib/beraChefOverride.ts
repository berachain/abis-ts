import { type Abi, formatAbiItem, parseAbi } from "abitype";

// TEMPORARY: mainnet and Bepolia currently use different BeraChef interfaces.
// Remove this file and its hook in modules.ts once mainnet is upgraded and the
// configured contract source generates the upgraded ABI. Consumers must then
// stop calling the legacy exemption methods.
//
// Entries that differ between @berachain/abis@0.1.3 and the verified Bepolia
// implementation (checked 2026-09-16):
// https://testnet.berascan.com/address/0x9f3f4125f119a9d34073013b121a8af8617837f3#code
// ABI membership does not imply that a method exists on both deployed versions.
const overrideAbi = parseAbi([
  "function isValExemptedFromInactivity(bytes valPubkey) view returns (bool isExemptedFromInactivity)",
  "function setValInactivityExemption(bytes valPubkey, bool isExempted)",
  "event ValInactivityExemptionSet(bytes indexed valPubkey, bool isExempted)",
  "error CannotRecoverRewardToken()",
  "error DonateAmountLessThanPayoutAmount()",
  "error InsufficientIncentiveTokens()",
  "error InvalidArray()",
  "error InvalidDistribution()",
  "error InvalidMerkleRoot()",
  "error InvalidRewardClaimDelay()",
  "error MinIncentiveRateIsZero()",
  "error NotBGT()",
  "error NotFeeCollector()",
  "error RewardInactive()",
  "function isValidatorExemptFromBaselineOverride(bytes valPubkey) view returns (bool isExempted)",
  "function isActiveIncentiveVault(address vault) view returns (bool)",
  "function setValBaselineOverrideExemption(bytes valPubkey, bool isExempted)",
  "event ValBaselineOverrideExemptionSet(bytes indexed valPubkey, bool isExempted)",
  "error IncentiveRateTooLow()",
]);

/** Add missing rollout entries without replacing existing definitions or creating overloads. */
export function applyBeraChefOverride(abi: Abi): Abi {
  const combined = [...abi];
  for (const item of overrideAbi) {
    const existing = combined.filter(
      (candidate) => candidate.type === item.type && "name" in candidate && candidate.name === item.name,
    );
    if (existing.length === 0) {
      combined.push(item);
    } else if (existing.length !== 1 || formatAbiItem(existing[0]) !== formatAbiItem(item)) {
      throw new Error(`Incompatible BeraChef ABI definition for ${item.name}`);
    }
  }
  return combined;
}
