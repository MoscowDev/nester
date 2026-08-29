import { defineConfig, globalIgnores } from "eslint/config";
import security from "eslint-plugin-security";

// Security-only lint surface, used by the CI gate added for nester#1236.
//
// The gate is named "Lint (security rules)" and that is what it now runs.
// Pointing it at the full `pnpm lint` surface instead made it fail on 47
// pre-existing style and react-hooks errors in files no security PR had
// touched, so enabling it would have red-lined every subsequent dapp PR for
// reasons unrelated to security — which is how a gate gets switched back off.
//
// The full ruleset still runs in the same job; it is the security subset that
// blocks a merge. Tightening the rest is separate work with its own backlog.
const securityConfig = defineConfig([
  security.configs.recommended,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/*.test.ts",
    "**/*.test.tsx",
  ]),
]);

export default securityConfig;
