# Runbook de Incidentes — Post-Deploy en Mainnet

**Origen:** `09_ROADMAP_MEJORAS.md` § 10 (Plan de contingencia post-deploy mainnet). Opción A ejecutada (documentación pura, sin cambios de contrato). Opción B (auditoría externa) queda como decisión pendiente de Abraham/Claudio — ver § 5.

**Precondición que no cambia con este documento:** `Crowdfunding.sol` no tiene `onlyOwner` ni mecanismo de pausa (`02_SMART_CONTRACT_SPEC.md`). Es una decisión de seguridad correcta y deliberada (evita rug-pull del propio equipo). Consecuencia directa: **ningún escenario de abajo permite "congelar" el contrato** — la única palanca real es comunicar rápido y deployar un contrato corregido.

**Limitación inherente, no resoluble por ningún runbook:** fondos ya reclamados (`claimed == true`) antes de detectarse un bug no son recuperables por esta vía — el creador ya los retiró de un contrato sin custodia de terceros.

---

## 1. Cómo se detecta un incidente

- **Monitoreo de eventos on-chain** (mínimo viable, sin infraestructura nueva): un listener simple sobre `ProjectCreated`/`Pledged`/`FundsClaimed`/`Refunded`/`ProjectDeleted` del contrato en mainnet (ej. `viem.watchContractEvent`, corrida como script o cron, no un servicio nuevo).
- **Reporte externo:** Claudio o un backer reporta comportamiento inesperado (monto incorrecto, tx que revierte sin motivo aparente, `refund`/`claimFunds` fallando).
- **Hallazgo interno:** un test nuevo o una revisión de código expone un bug antes de que se explote (mismo patrón ya ocurrido en este proyecto — ver `05_CRITICAL_REVIEW.md` § bug de `TxWatcher`).

Ante cualquiera de estas señales: pasar a § 4 (registro de incidente) **antes** de tomar cualquier acción correctiva.

---

## 2. Escenarios de fallo mapeados contra las funciones reales del contrato

### 2.1 Bug en `pledge`
- **Impacto:** afecta a quien intente aportar *después* de detectado el bug (los pledges ya confirmados no son necesariamente el problema, depende de la naturaleza del bug).
- **Acción inmediata:** comunicar a Claudio que deje de promocionar el link de "aportar" mientras se investiga. No hay forma técnica de bloquear `pledge` en el contrato viejo (sin `Pausable`) — la única barrera real es dejar de dirigir tráfico a la UI de pledge.
- **Frontend:** ocultar el botón "Pledge" vía flag de configuración del frontend (ej. variable de entorno `VITE_PLEDGE_DISABLED=true` leída por `PledgeForm.tsx`) — **esto no es una protección real** (cualquiera puede llamar al contrato directo), es solo para dejar de facilitar el error a usuarios de buena fe mientras se prepara el redeploy.

### 2.2 Bug en `claimFunds`
- **Impacto:** afecta a creadores con `isSuccessful == true` que todavía no reclamaron.
- **Acción inmediata:** identificar (via `getProject` en loop, o el evento `ProjectCreated`/`Pledged` acumulado) qué proyectos están en ese estado. Contactar directamente a esos creadores instruyéndolos a **no llamar `claimFunds`** hasta nuevo aviso.
- **Nota importante:** si el bug está específicamente en el cálculo de qué se transfiere (ej. un monto incorrecto), un creador que ya reclamó con el bug activo no tiene forma de revertir esa transacción — es irreversible por diseño de blockchain.

### 2.3 Bug en `refund`
- **Impacto:** el más urgente de los 4 — afecta a cualquier backer de un proyecto no exitoso, en cualquier momento antes del claim.
- **Acción inmediata:** instruir a **todos los backers con pledge activo** a intentar `refund` de inmediato, antes de que el creador correspondiente llame `claimFunds` (si el bug permite que ambas cosas coexistan mal). Priorizar la comunicación a este escenario sobre los otros 3.

### 2.4 Bug en `deleteProject`
- **Impacto:** el de menor urgencia financiera directa (la función ya está diseñada para revertir si `pledged > 0 && !claimed`, ver `05_CRITICAL_REVIEW.md`), pero un bug aquí podría dejar un proyecto en un estado fantasma inconsistente.
- **Acción inmediata:** deshabilitar el botón "Eliminar proyecto" en el frontend (mismo patrón de flag que § 2.1) hasta confirmar el alcance real del bug.

---

## 3. Cadena de comunicación

1. **Abraham** detecta o recibe el reporte → registra el incidente (§ 4) → notifica a **Claudio** por el canal ya establecido con él (no definido formalmente en ningún doc del proyecto — **pendiente**: Claudio y Abraham deben acordar un canal fijo, ej. WhatsApp/email, *antes* de ir a mainnet, no durante un incidente).
2. **Claudio** aprueba el mensaje a backers (es su producto/marca, no una decisión técnica).
3. **Comunicación a backers:** vía los canales que la campaña ya use externamente (redes sociales, email si existiera lista) — el contrato no tiene forma de notificar on-chain a los backers, así que este paso depende 100% de canales fuera del proyecto. **Riesgo aceptado:** un backer que no siga esos canales puede no enterarse a tiempo — no hay mitigación técnica posible sin un sistema de notificaciones que hoy no existe.

---

## 4. Registro de incidente (checklist mínimo, completar en cada evento)

```
Fecha/hora detección:
Función afectada (pledge / claimFunds / refund / deleteProject):
Tx hash del bug (si aplica, primera ocurrencia observada):
Proyectos afectados (IDs):
Monto de fondos en riesgo (estimado):
Vía de detección (monitoreo / reporte externo / hallazgo interno):
Acción tomada:
Responsable:
Estado (abierto / mitigado / cerrado):
```
Guardar cada incidente como un archivo `docs/incidents/YYYY-MM-DD-<slug>.md` (carpeta a crear en el primer incidente real).

---

## 5. Migración manual (sin migración automática de fondos)

**Lo que SÍ hace:** recrea el registro de campañas activas en un contrato nuevo corregido, preservando `metadataCID` (la metadata en IPFS no cambia).

**Lo que NO hace:** mover fondos. Los fondos del contrato viejo solo salen vía `refund`/`claimFunds` de ese mismo contrato — no existe (ni debería existir) una función que mueva ETH entre contratos sin pasar por sus dueños legítimos.

### Especificación de `scripts/migrate-projects.ts` (no implementado todavía — spec para cuando se autorice)
1. Leer todos los proyectos del contrato viejo: `getProject(id)` en loop desde `0` hasta `nextProjectId`.
2. Filtrar candidatos a migrar: proyectos con `creator != address(0)` (no borrados) y `!claimed` (si ya se reclamó, el proyecto terminó su ciclo de vida, no hay nada que migrar).
3. Para cada candidato: llamar `createProject(goal, metadataCID)` en el contrato **nuevo**, con la wallet del propio creador original (requiere que el creador ejecute su propia transacción — este script no puede firmar en nombre de terceros).
4. **No transferir `pledged`:** el proyecto nuevo empieza en `pledged = 0`. Los backers del proyecto viejo deben:
   - Pedir `refund` en el contrato viejo (recuperan su ETH), y
   - Opcionalmente, volver a hacer `pledge` en el proyecto recreado en el contrato nuevo.
   Esto es una limitación de diseño aceptada, no un bug del script: no hay forma segura de "copiar" balances sin que el contrato viejo custodie fondos que ya no controla.

---

## 6. Decisiones pendientes de Abraham/Claudio (no asumidas por este documento)

| Punto | Estado |
|---|---|
| Opción B (auditoría externa profesional antes de mainnet) | **Pendiente de decisión explícita** — es una decisión de presupuesto de Claudio, no técnica. Este runbook no la reemplaza: reduce el *después*, no el *antes*. |
| Opción C (Pausable + multisig) | Descartada por recomendación técnica (ver `09_ROADMAP_MEJORAS.md` § 10) — reintroduce un rol privilegiado sobre un contrato diseñado explícitamente para no tenerlo. No revisitar salvo que A resulte insuficiente en la práctica (un incidente real donde la falta de pausa cause pérdida evitable). |
| Canal fijo de comunicación Abraham↔Claudio↔backers | **No definido.** Debe acordarse antes del deploy en mainnet, no durante un incidente. |

---

## Fuente de los criterios de seguridad aplicados
- Ausencia de `onlyOwner`/pausa: decisión ya documentada y justificada en `02_SMART_CONTRACT_SPEC.md` § "Por qué el contrato nunca queda bloqueado".
- Patrón pull-payment / irreversibilidad de `claimFunds`: `01_ARCHITECTURE.md` § 1.
- Precedente de redeploy sin migración de fondos (mismo mecanismo, en testnet): `05_CRITICAL_REVIEW.md` § "Nueva función: deleteProject" y § "Decision revertida... backend mínimo" (mismo patrón de "nuevo deploy, dirección nueva, `.env` actualizado").

## Apéndice A — Incidente técnico de frontend: Lighthouse `NO_FCP`

Este incidente no afectaba fondos ni transacciones, pero bloqueaba la medición local de rendimiento. La referencia completa está en `09_ROADMAP_MEJORAS.md` § 7.

### Síntoma

`npm run build` generaba SSR válido y el navegador mostraba la landing, pero Lighthouse terminaba con `NO_FCP`. Una página estática mínima pasaba. Bloquear JavaScript no lo solucionaba.

### Diagnóstico correcto

La condición suficiente era una animación CSS above-the-fold cuyo frame inicial tenía `opacity: 0` y `animation-fill-mode: both`. La animación `reveal-immediate-in` dejaba el contenido en un estado no pintable cuando Lighthouse/CDP pausaba o no avanzaba el reloj de animaciones. No asumir que un HTML SSR correcto descarta un problema de CSS de pintura.

### Corrección

Animar únicamente `transform` y dejar `opacity` sin animar, de forma que el elemento sea visible/pintable desde el primer frame. No eliminar la landing, SSR, JavaScript ni Lighthouse para ocultar el síntoma. Antes de continuar con el diagnóstico, reinstalar con `npm ci` si existe evidencia de mezcla de `npm` y `pnpm`.

### Checklist de regresión

1. `cd frontend2.0 && npm ci`
2. `npm run build`
3. `npm run preview`
4. Medir la URL del preview con Lighthouse.
5. Si vuelve `NO_FCP`, comparar una corrida con las animaciones above-the-fold desactivadas y revisar primero `opacity: 0`, `visibility: hidden` y `animation-fill-mode: both`.
