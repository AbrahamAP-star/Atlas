/// <reference types="vite/client" />

// Migrado 1:1 desde frontend/src/vite-env.d.ts (docs/08_FRONTEND_MIGRATION.md).
// Sin este archivo, import.meta.env.VITE_* no tiene tipos y TS marca error
// en crowdfundingConfig.ts/usePinataUpload.ts/useIpfsAuth.ts.

interface ImportMetaEnv {
  readonly VITE_CROWDFUNDING_ADDRESS_SEPOLIA: string;
  readonly VITE_CROWDFUNDING_ADDRESS_BASE_SEPOLIA: string;
  readonly VITE_BACKEND_URL: string;
  // E2E-only (docs/09_ROADMAP_MEJORAS.md §12), set by scripts/e2e-setup.ts's
  // generated frontend2.0/.env.e2e.local — undefined in every other build.
  readonly VITE_E2E?: string;
  readonly VITE_CROWDFUNDING_ADDRESS_ANVIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
