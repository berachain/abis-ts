# @berachain/abis-ts

Typed ABI exports for [viem](https://viem.sh) generated from Solidity contract repos using [Foundry](https://book.getfoundry.sh/).

## Usage

Each contract ABI is available as a separate subpath import for tree-shaking:

```ts
import { rewardVaultAbi } from "@berachain/abis-ts/contracts/pol/rewards/rewardVault";
import { bgtAbi } from "@berachain/abis-ts/contracts/pol/bgt";
```

All exports are typed `as const` for full viem type inference.

## How it works

1. Clones configured contract repos (or uses local paths).
2. Runs Foundry build commands (`forge build`).
3. Walks the Solidity source directory to discover contracts.
4. Reads compiled artifacts and generates `export const …Abi = [...] as const` TypeScript modules.
5. Outputs one `.ts` file per contract, preserving the source repo's directory structure.

No generated files are committed. Everything is built on demand.

## Configuration

Edit `abi.config.json`:

```json
{
  "outputDir": "src/generated/abi",
  "barrelFile": "src/generated/abi/exports.ts",
  "reposDir": ".repos",
  "onMissingRepo": "error",
  "sources": [
    {
      "id": "contracts",
      "repo": "berachain/contracts-internal",
      "ref": "main",
      "buildCommand": "npm install && forge build",
      "srcDir": "src",
      "outDir": "out",
      "excludePatterns": ["I*.sol", "*_V*.sol"]
    }
  ]
}
```

### Source fields

| Field | Required | Description |
|---|---|---|
| `id` | yes | Unique identifier, used as top-level output directory |
| `repo` | one of `repo`/`repoPath` | GitHub shorthand (`org/repo`) or full git URL |
| `repoPath` | one of `repo`/`repoPath` | Local path to a pre-existing checkout |
| `ref` | no | Branch, tag, or SHA (defaults to repo default branch) |
| `buildCommand` | yes | Shell command to compile contracts |
| `srcDir` | no | Solidity source directory (default: `src`) |
| `outDir` | no | Foundry output directory (default: `out`) |
| `excludePatterns` | no | Filename patterns to skip (e.g. `I*.sol` for interfaces) |

### Top-level fields

| Field | Default | Description |
|---|---|---|
| `outputDir` | required | Directory for generated TypeScript modules |
| `barrelFile` | required | Path to the barrel re-export file |
| `reposDir` | `.repos` | Directory for cached repo clones |
| `onMissingRepo` | `error` | Behavior when a repo can't be resolved (`error` or `warn`) |

## Private repos

Set `GITHUB_TOKEN` or `GH_TOKEN` environment variable. The token is injected into HTTPS clone URLs automatically.

## Scripts

| Command | Description |
|---|---|
| `pnpm abi:generate` | Clone repos, build, and generate TypeScript ABI modules |
| `pnpm build` | Generate + bundle with tsup (ESM + CJS + DTS) |
| `pnpm test` | Run tests with vitest |
| `pnpm lint` | Check with biome |
| `pnpm lint:fix` | Auto-fix with biome |
| `pnpm typecheck` | Type-check with tsc |
| `pnpm abi:clean` | Remove cached repo clones (`.repos/`) |

## Requirements

- Node.js >= 24
- pnpm
- Foundry (`forge`) for building Solidity contracts

## Adding a new contract source

1. Add an entry to `sources[]` in `abi.config.json` with a unique `id`.
2. Run `pnpm abi:generate` to verify discovery and generation.
3. Import via `@berachain/abis-ts/{id}/path/to/contract`.
