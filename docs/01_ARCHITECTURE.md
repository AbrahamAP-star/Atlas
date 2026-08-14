# Architecture — Technical Rationale

## 1. Smart contract layer
- **Solidity ^0.8.24**, Hardhat for dev/test/deploy.
- **OpenZeppelin Contracts v5.5.x**. Since v5.5, `ReentrancyGuard` is *stateless*, living at `@openzeppelin/contracts/utils/ReentrancyGuard.sol` (no longer `/security/`, deprecated path). `ReentrancyGuardUpgradeable` was removed in 5.5 — use the non-upgradeable variant.
- Pattern: **checks-effects-interactions** + `nonReentrant` as defense in depth, not a substitute.
- Not using OZ's `Escrow.sol`/`PullPayment.sol` (generic payments, no crowdfunding-goal semantics). Built a custom contract using an internal pull-payment pattern (balance mapping + self-withdrawal) instead of `transfer`/`send`, avoiding reentrancy and the EIP-1884 2300-gas stipend limit.

## 2. Frontend layer
- **Wagmi v2** (`wagmi`, ~3.6.x on npm) — React hooks layer.
- **Viem** — low-level TS client Wagmi runs on; modern ethers.js replacement, lighter, better typed.
- **TanStack Query** — async cache/state, required by Wagmi v2.
- **TypeScript** throughout.
- Connectors: MetaMask via EIP-6963 auto-discovery; WalletConnect optional, future phase.
Maintenance note: Wagmi's API has changed across v1→v2; **pin exact versions in package.json** (no `^`) to avoid unplanned breakage.

## 3. L2 layer (deploy)
Choice: **Base** (optimistic rollup, EVM-equivalent, low gas, good wallet/tooling adoption). Valid alternatives: Arbitrum, Optimism. Gas limits (350k/120k) are comfortable on any of these L2s but **tight if ever deployed to L1 mainnet** — gas design targets the worst case (L1) for portability.

## 4. IPFS
Heavy campaign metadata (image, long description, documents) is NOT on-chain (would blow the gas budget). Uploaded off-chain to IPFS (Pinata); only the **CID (bytes32/string)** is stored on-chain. The contract is the source of truth for funds; IPFS is presentation only.

**Update (2026-07-10):** uploads to Pinata no longer happen directly from the browser. `/backend` (minimal Express) now holds the Pinata JWT server-side and exposes `/api/pin-file`/`/api/pin-json`. Detail in `05_CRITICAL_REVIEW.md`. Doesn't change fund architecture (still 100% on-chain); only relocates a third-party secret.

## 5. Testing
Hardhat + Chai + `hardhat-gas-reporter` intended originally to verify `createProject`/`pledge` stay under 350k/120k gas as an automated test, not just a promise. **Superseded — see correction below: real stack is Hardhat 3 + node:test, not Chai.**

## Sources consulted
wagmi.sh docs, npmjs.com/package/wagmi, github.com/OpenZeppelin/openzeppelin-contracts (CHANGELOG + `ReentrancyGuard(Transient).sol`), docs.openzeppelin.com/contracts, forum.openzeppelin.com (ReentrancyGuardUpgradeable removal in 5.5), community wagmi/viem/ethers.js comparisons (2026).

## Correction — Phase 1 (2026-07-05)
Section 5 above went stale once Phase 0 ran. Confirmed directly against `hardhat.config.ts`/`package.json`/`node_modules`:

- **Real testing stack: Hardhat 3 + `node:test` + viem + `hardhat-viem-assertions`**, NOT Mocha/Chai. `package.json` installs `@nomicfoundation/hardhat-toolbox-viem` (Nomic Foundation's recommended toolbox for new HH3 projects), which brings Node's native runner instead of Mocha. Source: hardhat.org/docs/guides/testing/using-viem, hardhat.org/docs/plugins/hardhat-toolbox-viem (July 2026). Gas reporting via `REPORT_GAS=true hardhat test` (script `test:gas`), plus explicit gas asserts inside tests (`receipt.gasUsed <= 350_000n`/`<= 120_000n`) so the limit fails the test automatically, not just appears in a report someone must read.
- **OZ installed: v5.6.1** (spec asked for 5.5.x). Compatible: confirmed `node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol` still lives at `/utils/`.
- **Decision added in Phase 1: use `ReentrancyGuardTransient`** (not classic `ReentrancyGuard`). Uses transient storage (TSTORE/TLOAD, EIP-1153) instead of normal storage for the reentrancy lock, saving ~2500-5000 gas per call — relevant given `pledge`'s hard 120k gas budget. Requires Cancún/EIP-1153 support; Base, Arbitrum, Optimism support it in 2026. Source: `node_modules/@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol` (OZ 5.6.1), same `nonReentrant` modifier, drop-in.

Detailed status/progress: always see `04_STATUS.md` (source of truth for progress; this file only documents technical rationale).
