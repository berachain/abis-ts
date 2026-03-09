# @berachain/abis

[![npm version](https://img.shields.io/npm/v/@berachain/abis.svg)](https://www.npmjs.com/package/@berachain/abis)

Typed ABI exports for Berachain contracts, compatible with [viem](https://viem.sh) and [wagmi](https://wagmi.sh).

## Install

```bash
pnpm add @berachain/abis
```

## Versioning

This package does **not** follow semver. Any release may add, remove, or restructure exports to match the latest contract deployments. Pin an exact version in your `package.json` to avoid surprises, for instance:

```json
{
  "dependencies": {
    "@berachain/abis": "0.1.0"
  }
}
```

Check the [GitHub releases](https://github.com/berachain/abis-ts/releases) for details on what changed in each version.

## Usage

Each contract ABI is available as a separate subpath import for tree-shaking:

```ts
import { rewardVaultAbi } from "@berachain/abis/pol/rewards/rewardVault";
import { bgtAbi } from "@berachain/abis/pol/bgt";
import { vaultAbi } from "@berachain/abis/bex/vault";
```

All exports are typed `as const` for full viem type inference.

## Available ABIs

<!-- exports:start --><!-- exports:end -->

## Sources

ABIs are generated from these contract repositories:

| Export prefix | Repository |
|---|---|
| _(top-level)_ | [berachain/contracts](https://github.com/berachain/contracts) |
| `staking-pools/` | [berachain/contracts-staking-pools](https://github.com/berachain/contracts-staking-pools) |
| `bend/` | [berachain/morpho-blue](https://github.com/berachain/morpho-blue) |
| `bex/` | [berachain/balancer-v2-monorepo](https://github.com/berachain/balancer-v2-monorepo) |

## License

MIT
