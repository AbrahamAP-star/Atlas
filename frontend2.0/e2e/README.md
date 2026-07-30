# E2E tests (Playwright + Anvil)

Origen: `docs/09_ROADMAP_MEJORAS.md` § 12. Corre el flujo real de la dApp
contra un contrato `Crowdfunding.sol` recién desplegado en un nodo Anvil
local — la capa exacta (frontend↔contrato) donde ocurrieron los 2 bugs más
serios del proyecto (`canClaim`/`canRefund`, destructuring de `toProject`;
ver `docs/05_CRITICAL_REVIEW.md`).

## Qué NO usa esto (decisión deliberada)

- **No usa Synpress ni automatiza la extensión real de MetaMask.** `wagmi`
  usa `injected()`, un conector EIP-1193 genérico — no hay código propio
  específico de MetaMask que valga la pena testear a través de su UI/popups.
  `e2e/fixtures.ts` inyecta un `window.ethereum` mínimo antes de que cargue
  la página, respaldado por las cuentas de prueba de Anvil (ya
  "desbloqueadas" en el propio nodo, igual que en Hardhat's node) — Anvil
  firma `eth_sendTransaction`/`personal_sign` del lado del servidor, sin
  manejo de claves privadas en el navegador.
- **No corre `/backend` ni usa una cuenta real de Pinata.** `e2e/fixtures.ts`
  intercepta a nivel de red (`page.route`) `/api/auth/nonce`,
  `/api/auth/verify`, `/api/pin-file`, `/api/pin-json`, y el propio gateway
  `gateway.pinata.cloud` — simulando lo que cada uno devolvería. El único
  paso real de wallet ahí (`personal_sign` sobre el nonce) sí ocurre de
  verdad; solo la verificación del backend y el "pineo" están mockeados.

## Cómo correrlo localmente

```bash
# Terminal 1 (raíz del repo): levanta Anvil + deploya el contrato + escribe frontend2.0/.env.e2e.local
npm run e2e:setup

# Terminal 2
cd frontend2.0
npx playwright install chromium   # una sola vez
npm run test:e2e
```

Requiere **Foundry** instalado (`anvil` en el PATH) — `curl -L https://foundry.paradigm.xyz | bash && foundryup` (ver book.getfoundry.sh/getting-started/installation). No instalable desde este entorno de análisis (sin acceso a `foundry.paradigm.xyz`), a correr por Abraham.

## Specs

- `happy-path.spec.ts`: crear proyecto (wallet A) → pledge exacto a la meta (wallet B) → claim (wallet A) → el botón "Claim funds" desaparece.
- `refund.spec.ts`: crear proyecto con meta alta (nunca se alcanza) → pledge (wallet B) → refund → el botón "Request refund" desaparece y el balance de la wallet sube (verificado con `eth_getBalance` real contra Anvil).

## Notas de diseño

- Ambas specs comparten `sharedMetadataStore` (fixture en `fixtures.ts`): lo
  que la wallet creadora "pinea" en `/api/pin-json` queda disponible para
  que la wallet backer lo "lea" del gateway mockeado — mismo comportamiento
  que IPFS real, sin depender de él.
- `fullyParallel: false` en `playwright.config.ts`: ambas specs comparten el
  mismo estado de cadena de Anvil (no hay una cadena nueva por test), correr
  en paralelo generaría condiciones de carrera irrelevantes para lo que este
  suite busca probar.
