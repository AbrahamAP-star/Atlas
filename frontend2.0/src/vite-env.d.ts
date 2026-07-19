/// <reference types="vite/client" />

// Migrado 1:1 desde frontend/src/vite-env.d.ts (docs/08_FRONTEND_MIGRATION.md).
// Sin este archivo, import.meta.env.VITE_* no tiene tipos y TS marca error
// en crowdfundingConfig.ts/usePinataUpload.ts/useIpfsAuth.ts.

interface ImportMetaEnv {
  readonly VITE_CROWDFUNDING_ADDRESS_SEPOLIA: string;
  readonly VITE_CROWDFUNDING_ADDRESS_BASE_SEPOLIA: string;
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
