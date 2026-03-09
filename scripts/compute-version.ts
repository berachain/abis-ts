/**
 * Compute the next version to publish.
 *
 * Reads BUMP and DIST_TAG from env vars, fetches the current published version
 * via resolveBaseVersion (which picks the higher of @<distTag> and @latest),
 * then applies the bump using semver.
 *
 * Supported BUMP values:
 *   - Named: patch, minor, major, prerelease, premajor, preminor, prepatch
 *   - Exact: 1.2.3  (stable) or 1.2.3-beta.1  (pre-release)
 *
 * Outputs the computed version string to stdout (no trailing newline).
 */

import { inc as semverInc, valid as semverValid } from "semver";

import { resolveBaseVersion } from "./lib/changelog.js";

const PACKAGE_NAME = "@berachain/abis";

const bump = process.env.BUMP;
const distTag = process.env.DIST_TAG ?? "latest";

if (!bump) {
  console.error("[compute-version] BUMP env var is required");
  process.exitCode = 1;
  process.exit();
}

const base = (await resolveBaseVersion(PACKAGE_NAME, distTag)) ?? "0.0.0";

let version: string | null;

if (semverValid(bump)) {
  // Exact version given (e.g. "1.2.3" or "1.2.3-beta.1").
  // If publishing to beta and no pre-release suffix present, append a timestamp
  // so the same base version can be published multiple times without conflict.
  if (distTag === "beta" && !bump.includes("-")) {
    const ts = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    version = `${bump}-beta.${ts}`;
  } else {
    version = bump;
  }
} else if (distTag === "beta") {
  // Named bump for a pre-release. "patch" → "prepatch", but "prerelease" stays
  // "prerelease" (don't double-prefix bumps that already start with "pre").
  const releaseType = bump.startsWith("pre") ? bump : `pre${bump}`;
  version = semverInc(base, releaseType as Parameters<typeof semverInc>[1], "beta");
} else {
  version = semverInc(base, bump as Parameters<typeof semverInc>[1]);
}

if (!version) {
  console.error(
    `[compute-version] Failed to compute version: base=${base}, bump=${bump}, distTag=${distTag}`,
  );
  process.exitCode = 1;
  process.exit();
}

process.stdout.write(version);
