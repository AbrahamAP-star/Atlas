# Project Overview — Plataforma de Financiación Descentralizada
 
## Contexto de negocio
Cliente: pequeña empresa sin conocimiento técnico de blockchain. Necesita levantar capital para proyectos sin depender de bancos/plataformas centralizadas lentas. Requiere que cualquier wallet pueda aportar fondos y que exista protección ante mala fe (fondos no deben "desaparecer").
 
## Objetivo técnico
DApp de crowdfunding on-chain: creación de campañas, aportes desde wallet, custodia de fondos en contrato (no en manos de un admin), liberación de fondos solo si se cumple meta, reembolso automático si no se cumple.
 
## Requisitos de aceptación (obligatorios)
- [x] Smart contract principal
- [x] Frontend completo (React) — listado/detalle (Fase 4) + crear/pledge/claim/refund (Fase 5)
- [x] Conexión de wallet (MetaMask vía Wagmi/Viem)
- [ ] Deploy en una L2
- [ ] Tests automatizados (Hardhat + Chai)
- [ ] Documentación técnica
- [ ] README para usuarios finales
## Restricciones duras (no negociables)
| Restricción | Límite |
|---|---|
| Gas crear proyecto | < 350,000 gas |
| Gas participar (pledge) | < 120,000 gas |
| Vulnerabilidades críticas conocidas | 0 |
| Bloqueo permanente del contrato | Prohibido (debe existir vía de salida para fondos) |
| Eventos en cada acción relevante | Obligatorio |
 
## Stack decidido (ver 01_ARCHITECTURE.md para justificación y fuentes)
- Solidity 0.8.24+ / Hardhat
- OpenZeppelin Contracts v5.5.x
- React + TypeScript
- Wagmi v2 + Viem + TanStack Query
- MetaMask / EIP-6963 connectors
- L2: Base (recomendado) — alternativa Arbitrum/Optimism
- IPFS para metadata de campañas (imágenes, descripción larga) vía CID guardado on-chain
## Filosofía de código (impuesta por el cliente)
- Sin funciones/variables globales que deban modificarse para adaptar el proyecto — solo constantes internas de función.
- Tipos `uint`/`int` ajustados al rango mínimo necesario (no usar `uint256` por defecto si no hace falta).
- `memory` por defecto en parámetros de función; `calldata`/`storage` solo cuando esté justificado.
- Funciones que cambian estado declaradas al final del archivo del contrato.
- Reutilizar OpenZeppelin siempre que exista solución probada; no reinventar.
- Código simple, mantenible por un equipo de 2 personas, replicable localmente sin tocar lógica.
## Entregables
Repositorio único con: `/contracts`, `/frontend`, `/backend`, `/scripts`, `/test`, `/docs`. `/backend` es un proxy minimo hacia Pinata (oculta el JWT, ver `05_CRITICAL_REVIEW.md`), no un backend de negocio: la fuente de verdad de fondos sigue siendo el contrato. Ver `03_PLAN_FASES.md` para el orden de construcción y `04_STATUS.md` para el estado actual.

## Mejora visual del frontend (bajo demanda, no bloqueante)
`06_FRONTEND_VISUAL_UPGRADE.md` es un mapa de referencia (no una fase secuencial) con animaciones, hovers, elevación, glow/neón y demás mejoras de UI/UX modernas, para que cualquier agente lo consulte cuando Abraham pida un efecto visual concreto sobre el frontend ya construido en Fases 4/5.

## Roadmap de mejoras post-review
`09_ROADMAP_MEJORAS.md` trackea 8 puntos identificados en la evaluación del proyecto (2026-07-19: CI, cobertura de tests real de componentes/TxTracker, cierre de Fase 3, backend persistente, etc.), cada uno con opciones para decidir — no una acción ya ejecutada. Consultar antes de asumir que el proyecto está "completo" en alguna área fuera del checklist de arriba.

## Convención de idioma (regla dura, no negociable — 2026-07-22)
**Todo el contenido fuera de `/docs` va en inglés**: código, nombres de archivo, funciones, variables, tipos, comentarios en código, mensajes de commit, `README.md` de la raíz. Sin excepción, aunque Abraham pida algo en español — la traducción a inglés es responsabilidad de quien escribe el código, no una opción.
**Solo `/docs` se mantiene en español** (este plan de ejecución y sus archivos hermanos), porque es el canal de comunicación con Abraham, no código que otros vayan a leer en internet.
Cualquier agente que edite código debe recordar esta regla antes de escribir, no solo al leer este archivo.