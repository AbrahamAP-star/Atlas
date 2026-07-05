# Revisión crítica de la propuesta original
 
## Contradicciones detectadas
1. **"On-chain la mayor parte posible" vs "no debe ser gigante ni complejo"**: subir frontend/IPFS content on-chain (ej. imágenes) rompe el presupuesto de gas (350k/120k) y no aporta valor real — nadie lee HTML desde un explorador de bloques. Decisión tomada: solo lógica financiera on-chain; presentación off-chain (React estático) + IPFS para metadata. Esto SÍ es "descentralizado" en lo que importa (custodia de fondos) sin inflar gas.
2. **"Funciones que cambian estado al final del archivo, tras cargar todo correctamente"**: esto es una convención de legibilidad válida, pero no aporta seguridad real por sí sola — en Solidity el orden textual de funciones no afecta el runtime ni previene ataques. Lo que sí previene reentrancy es CEI + `nonReentrant`, que ya está incluido. Se mantiene el orden por legibilidad/mantenibilidad (pedido explícito), pero no debe venderse al cliente como medida de seguridad.
3. **Restricción de gas dura (350k/120k) calculada para L2**: en L1 mainnet esos mismos límites serían generosos para `createProject` pero ajustados para `pledge` si se usa un mapping anidado sin optimizar el slot. El diseño con `uint96`/`uint40` empaquetados en un solo slot (struct packing) es lo que hace viable cumplir 120k gas de forma consistente — sin ese empaquetado el límite sería arriesgado.
## Huecos que el cliente no mencionó pero son necesarios
- **Qué pasa si el creador crea un proyecto y nunca hay backers**: cubierto — `refund` no aplica (no hay pledges), y no hay fondos bloqueados porque nunca hubo depósito.
- **Ataque de front-running en `claimFunds`**: mitigado porque solo `creator` puede llamarlo y el monto ya es fijo on-chain; no hay ventana de manipulación de precio (no hay oráculo).
- **Divisibilidad de `uint96`**: si en el futuro se soporta ERC-20 con 18 decimales y montos grandes, `uint96` podría quedarse corto. Está documentado en `02_SMART_CONTRACT_SPEC.md` como ajuste futuro, no un bug actual.
## Recomendación de mi parte (no pedida explícitamente, mejora la propuesta)
Añadir a Fase 2 un test específico de "grief" donde un mismo backer hace pledge 0 repetidamente para ver si algún evento o cálculo se rompe con montos cero — no cuesta nada y cierra un vector de confusión de UX/logs.

## Bugs encontrados y corregidos al implementar Fase 1 (2026-07-05)
Esta spec, aunque sólida en el diseño general, tenía huecos concretos que solo aparecieron al escribir el código real:

1. **`isSuccessful`/`isExpired` sobre un `id` inexistente devolvían `true`/comparaciones con datos en cero** (`pledged=0 >= goal=0`). Un proyecto que nunca existió parecía "exitoso". Fix: `_requireProjectExists` en toda función que recibe un `id`.
2. **Conversión `uint256 → uint96`/`uint40` sin `SafeCast` trunca en silencio** en vez de revertir — Solidity 0.8 solo hace checked arithmetic en operaciones (+, -, *), no en casts explícitos de tipo. Un `msg.value` mayor a `type(uint96).max` se habría truncado sin error. Fix: `SafeCast.toUint96`/`toUint40` en todas las conversiones.
3. **`goal == 0` rompía la semántica de éxito/fracaso** (ver punto 1). Fix: `require(goal > 0)` vía error `InvalidGoal`.
4. La recomendación de "test de grief con pledge=0" de este mismo documento se resolvió de raíz: en vez de solo testear el comportamiento, se **rechaza `msg.value == 0`** directamente (`ZeroPledge`), eliminando el vector de ruido de eventos en vez de solo documentarlo.

Detalle del código y del resto de decisiones: `02_SMART_CONTRACT_SPEC.md` y `04_STATUS.md`.
