# Project Overview — Plataforma de Financiación Descentralizada
 
## Contexto de negocio
Cliente: pequeña empresa sin conocimiento técnico de blockchain. Necesita levantar capital para proyectos sin depender de bancos/plataformas centralizadas lentas. Requiere que cualquier wallet pueda aportar fondos y que exista protección ante mala fe (fondos no deben "desaparecer").
 
## Objetivo técnico
DApp de crowdfunding on-chain: creación de campañas, aportes desde wallet, custodia de fondos en contrato (no en manos de un admin), liberación de fondos solo si se cumple meta, reembolso automático si no se cumple.
 
## Requisitos de aceptación (obligatorios)
- [ ] Smart contract principal
- [ ] Frontend completo (React)
- [ ] Conexión de wallet (MetaMask vía Wagmi/Viem)
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
Repositorio único con: `/contracts`, `/frontend`, `/scripts`, `/test`, `/docs`. Ver `03_PLAN_FASES.md` para el orden de construcción y `04_STATUS.md` para el estado actual.