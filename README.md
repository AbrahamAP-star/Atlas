# CrowdfundingDappClaudio

DApp de crowdfunding on-chain (custodia de fondos 100% en contrato, sin admin). Ver `docs/00_PROJECT_OVERVIEW.md` para el contexto de negocio completo.

> Este README es la **Opción B** del punto 8 de `docs/09_ROADMAP_MEJORAS.md`: solo la guía técnica de arranque local. El README para el usuario final no técnico (Claudio) queda para la Fase 6, cuando exista red de producción real.

## Estructura del repo

```
contracts/      Crowdfunding.sol (Hardhat 3 + OZ 5.6.1)
test/           node:test + viem (NO Mocha/Chai)
frontend2.0/    TanStack Start (SSR) — frontend oficial. frontend/ (Vite SPA) fue eliminado.
backend/        Proxy Express mínimo hacia Pinata (oculta el JWT)
docs/           Fuente de verdad de arquitectura/estado (ver 04_STATUS.md)
```

## Requisitos
- Node.js ≥ 22.12 (CI corre matrix 22/24, ver `.github/workflows/ci.yml`)
- Cuenta de Pinata (plan gratuito sirve) con API key de **scope restringido** (`pinFileToIPFS`/`pinJSONToIPFS` únicamente)

## 1. Contratos (raíz del repo)

```bash
npm install
npm run compile
npm test            # 38 tests (Crowdfunding + PledgeFuzz + ReentrancyAttack)
npm run test:gas    # reporte de gas (asserts duros ya en los tests: <350k createProject, <120k pledge)
```

Secretos vía Hardhat 3 keystore (no `.env`):
```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set BASESCAN_API_KEY
```

Contrato ya desplegado (Sepolia, incluye `deleteProject`): `0xb76d8fE65b68C80c71d0494Ba69E2874EdA7Ba6b` (ver `deployments/sepolia.json`). Deploy en Base Sepolia (L2 objetivo real) sigue pendiente — ver `docs/09_ROADMAP_MEJORAS.md` § 2.

## 2. Backend (`/backend`)

```bash
cd backend
npm install
cp .env.example .env    # completar PINATA_JWT (scope restringido, ver docs/05_CRITICAL_REVIEW.md)
npm run dev              # levanta en :3001
```

`FRONTEND_ORIGIN` en `backend/.env` debe apuntar al puerto real de `frontend2.0` (por defecto `8080`, vía `@lovable.dev/vite-tanstack-config`).

**Rate limit (punto 11 de `docs/09_ROADMAP_MEJORAS.md`):** las subidas se limitan por IP **y** por wallet address combinados (`backend/src/rateLimiter.ts`), no solo por IP. Además de `PINATA_JWT`, completar `ADMIN_UNPIN_KEY` en `backend/.env` (credencial separada, usada solo por `POST /api/admin/unpin` para retirar contenido reportado):
```bash
cd backend
npm run audit:uploads              # lista uploads de las ultimas 24h (CID + wallet + IP)
curl -X POST http://localhost:3001/api/admin/unpin \
  -H "X-Admin-Key: $ADMIN_UNPIN_KEY" -H "Content-Type: application/json" \
  -d '{"cid":"<CID_REPORTADO>"}'
```

## 3. Frontend (`/frontend2.0`)

```bash
cd frontend2.0
npm install
npm run dev      # requiere backend corriendo en paralelo para crear proyectos (IPFS)
npm run test      # 42 tests (Vitest + RTL)
npm run build && npm run preview   # build de producción local
```

`frontend2.0/.env` ya trae la dirección del contrato en Sepolia. La dApp funcional vive embebida en `/` (sección `#demo`), no en una ruta separada — ver `docs/08_FRONTEND_MIGRATION.md`.

## 4. Tests E2E (Playwright + Anvil)

```bash
npm run e2e:setup                 # raiz: levanta Anvil + deploya el contrato
cd frontend2.0 && npm run test:e2e   # 2 specs: happy path (create/pledge/claim) + refund
```
Requiere Foundry (`anvil`) instalado. Detalle completo, por que no se usa Synpress/MetaMask real, y por que no corre el backend real: `frontend2.0/e2e/README.md`. Origen: `docs/09_ROADMAP_MEJORAS.md` § 12.

## CI

`.github/workflows/ci.yml`: jobs `contracts` (Node 22/24), `frontend` (Node 22/24), `gas-report` (comenta en PRs), `lighthouse` (umbrales en `warn`, ver `docs/09_ROADMAP_MEJORAS.md` § 7).

## Más contexto
- Estado real y sesiones: `docs/04_STATUS.md`
- Decisiones de arquitectura y por qué: `docs/01_ARCHITECTURE.md`, `docs/05_CRITICAL_REVIEW.md`
- Roadmap de mejoras pendientes: `docs/09_ROADMAP_MEJORAS.md`
