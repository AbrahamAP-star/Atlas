# Mobile Support — Soporte para celulares

## Proposito
Este documento registra que la DApp fue adaptada para verse y usarse bien en
celulares (pantallas ~360px-428px de ancho), y sirve de referencia para
cualquier agente futuro que agregue componentes nuevos: seguir el mismo
patron de mobile-first liviano descrito aqui, no reinventar otro.

## Diagnostico (2026-07-14): que estaba roto en mobile antes de este cambio
- `.app-header` era un `flex` fila sin wrap: el titulo y `ConnectWallet`
  (selector de red + address + boton) competian por el ancho y se apretaban
  o desbordaban en pantallas angostas.
- `.pledge-form`/`.action-block` eran filas fijas: en pantallas angostas el
  input de monto y los botones quedaban apretados o el texto se cortaba.
- `.tx-toast-stack` tenia `max-width: 320px` fijo pegado a la esquina: en un
  telefono de 360px de ancho, quedaba casi pegado a los bordes sin margen
  visual.
- Botones sin `min-height`: por debajo del tamano tactil comodo recomendado
  (~44px), dificil de tocar con precision en pantallas pequenas.
- `.file-field`/`.file-attachment-card` (drag-and-drop de documento en
  `CreateProjectForm.tsx`) nunca habian tenido CSS propio — se veian como
  texto plano sin caja, un problema en cualquier tamano de pantalla pero mas
  notorio en mobile por la falta de affordance tactil clara.
- El resto (`.project-grid` con `auto-fill`, `.hero-title` con `clamp()`, el
  Hero/marquee) ya era responsive desde su implementacion original — no se
  toco de nuevo.

## Que se hizo
Todo el trabajo fue **CSS-only**, dentro del `@media (max-width: 640px)` ya
existente en `frontend/src/styles.css` (se extendio, no se creo uno
duplicado) + un bloque nuevo de estilos para `.file-field`/`.file-attachment-card`
que aplica en todos los tamanos (arreglaba un gap real, no solo mobile).
Ningun componente `.tsx` cambio de estructura — el objetivo era resolver esto
sin JS adicional ni breakpoints nuevos dispersos por el codigo.

- **`.app-header`**: pasa a `flex-direction: column` en mobile, titulo mas
  chico (`1.3rem`), `.wallet-box` ocupa el ancho completo.
- **`.pledge-form`**: `flex-direction: column` en mobile (el input y el boton
  de "Pledge" se apilan en vez de compartir una fila angosta).
- **`.action-block`**: `flex-wrap: wrap` para que los botones de accion
  (crear/cancelar, reclamar/reembolso) bajen de linea en vez de desbordar.
- **`.view-toolbar`**: `flex-wrap: wrap` (mismo criterio).
- **`.tx-toast-stack`**: en mobile se ancla a `left/right: 1rem` (ancho
  fluido con margen) en vez de un `max-width` fijo pegado a una esquina.
- **Botones**: `min-height: 44px` en mobile (area tactil recomendada).
- **`.file-field`/`.file-attachment-card`**: estilos nuevos (aplican a todos
  los tamanos), con `flex-wrap` y `text-overflow: ellipsis` en el nombre del
  archivo para que un nombre largo no rompa el layout en pantallas angostas.

## Que NO se toco (y por que)
- **`index.html`**: el meta viewport (`width=device-width, initial-scale=1.0`)
  ya estaba correcto desde Fase 4 — condicion basica sin la cual nada de esto
  funcionaria, se verifico pero no requirio cambios.
- **`.project-grid`** (`repeat(auto-fill, minmax(240px, 1fr))`): ya colapsa a
  una columna en mobile de forma nativa via CSS Grid, no necesitaba media
  query propia.
- **Hero/marquee** (`06_FRONTEND_VISUAL_UPGRADE.md` §9): `.hero-title` con
  `clamp()` y el `@media (max-width: 640px)` que reduce `--gap-carousel`/
  `.showcase-card` ya existian desde su implementacion original.
- **Breakpoints de tablet** (ej. 768px-1024px): no se agregaron a proposito —
  el layout de un solo contenedor centrado (`max-width: 880px`) que ya tiene
  la DApp se comporta bien en tablet sin necesidad de un breakpoint
  intermedio; agregar uno sin un problema real que resolver seria complejidad
  injustificada.

## Pendiente (no bloqueante, candidato a futuro si el uso real lo pide)
- No se probo en dispositivo fisico real, solo via devtools/responsive mode.
  Recomendado que Abraham valide en un celular real antes de dar esto por
  cerrado del todo (fuentes del sistema, tap targets, y el flujo de firma de
  MetaMask Mobile/wallets moviles pueden comportarse distinto a Chrome
  desktop con devtools).
- `useInfiniteMarquee.ts`/`CarouselRow.tsx` no se revisaron a fondo para
  interacciones tactiles (ej. pausar el marquee al tocar, en vez de solo al
  hacer hover, que no existe en touch) — el marquee sigue andando solo,
  funcional pero sin ese detalle de pulido tactil.
