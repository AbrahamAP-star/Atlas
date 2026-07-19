# Frontend Visual Upgrade — Mapa de referencia para agentes IA

## Propósito de este documento
Este archivo es un **mapa de ejecución**, no una fase cerrada que haya que completar de punta a punta. Cuando Abraham pida un efecto visual concreto (ej. *"eleva este hover y añade luces neón al pasar el mouse"*), el agente debe:

1. Ubicar el efecto pedido en el **§4 Catálogo de efectos** (o el más parecido).
2. Usar la herramienta que ese efecto indica (§2), ya instalada según §3.
3. Aplicar los tokens de diseño de §5 (no inventar colores/duraciones nuevos sueltos).
4. Verificar el checklist de §6 (performance/accesibilidad) antes de dar el código por terminado.
5. Tocar **solo** el componente/archivo relevante — este documento es puramente visual, nunca justifica tocar `contracts/`, hooks de escritura (`useCreateProject`, `usePledge`, etc.) o la lógica de `useNetworkStatus`/`useProjectStatus`.

No es un plan de fases secuencial obligatorio como `03_PLAN_FASES.md`: las "fases" de §7 son bloques de trabajo que se activan bajo demanda, en el orden que Abraham pida, no un roadmap que haya que recorrer completo.

## Contexto: qué inspira esto y por qué
Análisis de `optimism.io` e `immutable.com` (ver conversación de referencia, 2026-07-10): ambas corren sobre Next.js con optimización de imágenes nativa y (en el caso de Optimism) Sanity CMS. **No vamos a migrar a Next.js** — sería sobre-ingeniería para una dApp de un solo flujo (listar/crear/pledge/claim/refund) sin necesidad de SSR ni CMS. Lo que sí es replicable sin cambiar de stack (Vite + React 19, ver `package.json` del frontend):

- Contadores animados que suben desde 0 al entrar en viewport.
- Transiciones de tabs/pestañas sin recarga.
- Tarjetas con elevación suave al hover + sombra de color.
- Paleta oscura con acentos de un solo color y mucho espacio negativo (esto último ya lo tiene el proyecto, ver `styles.css`).

## 1. Stack actual (punto de partida, no tocar sin razón)
```json
"react": "19.2.7",
"react-dom": "19.2.7",
"vite": "8.1.3",
"@vitejs/plugin-react": "6.0.3"
```
CSS: vanilla, con tokens en `:root` de `frontend/src/styles.css` (`--ink`, `--paper`, `--accent`, etc.). **Actualización (2026-07-10):** Tailwind CSS v4 y shadcn/ui pasan de "opcional" a **decisión tomada** — se instalan a pedido explícito de Abraham (motivo: aprendizaje), ver §9. Hasta que esa tarea se ejecute, siguen sin estar en `package.json`; no asumir que ya están instalados sin comprobarlo.

## 2. Herramientas nuevas recomendadas (con criterio de cuándo usar cada una)

| Herramienta | Para qué | Cuándo NO usarla |
|---|---|---|
| **GSAP + `@gsap/react`** | Animaciones imperativas complejas: scroll-trigger, timelines, contadores, morphing, stagger. Es la herramienta estándar de la industria (100% gratis desde 2025, incluye SplitText/MorphSVG). | Para un simple fade/hover que CSS puro resuelve igual de bien con menos JS a cargar. |
| **CSS nativo (transitions/animations/`@property`)** | Hovers, elevación, glow, transiciones de color/sombra — el 80% de "pulir la UI" no necesita JS. | Cuando el efecto depende de scroll-position o de secuenciar múltiples elementos con timing relativo. |
| **View Transitions API nativa** (`document.startViewTransition`) | Transición suave entre vista `list` → `detail` → `create` en `App.tsx`, sin instalar nada. Soportada en Chrome/Edge/Safari recientes; degrada a cambio instantáneo en navegadores sin soporte (no rompe nada). | — |
| **Tailwind CSS v4** (DECIDIDO 2026-07-10, ver §9) | v4 usa `@theme` que **lee directamente las CSS custom properties existentes** (`--ink`, `--accent`, etc.) — no hay que reescribir la paleta. Acelera escribir variantes de hover/estado sin CSS nuevo por componente. Se adopta para el Hero/landing (§9) con fin de aprendizaje explicito de Abraham. | No usarlo para reemplazar tokens/CSS ya escrito y funcionando fuera del alcance de la tarea que lo motivó — la migración es incremental, no un rewrite del CSS vanilla existente. |
| **shadcn/ui** (DECIDIDO 2026-07-10, ver §9) | Componentes copiados al repo (no dependencia cerrada), útiles para piezas puntuales de UI (botones, CTAs) sin reinventar accesibilidad/estados desde cero. Requiere Tailwind ya instalado. | No forzarlo en contenido visual custom (ej. el marquee de §9.2) que no gana nada con un componente genérico. |
| **`vite-imagetools`** | Servir las imágenes de metadata (subidas a IPFS, mostradas en `ProjectCard`/`ProjectDetail`) en tamaños/formatos optimizados (AVIF/WebP) en vez del original crudo del gateway IPFS. | — |

**Instalación (versiones verificadas en npmjs.com el 2026-07-10 — reconfirmar antes de instalar si pasa tiempo):**
```bash
npm install gsap@3.15.0 @gsap/react@2.1.2
```
Tailwind + shadcn/ui (decidido, ver §9 — reconfirmar versiones el mismo día de instalación):
```bash
npm install tailwindcss@4.3.2 @tailwindcss/vite@4.3.2
npx shadcn@latest init   # genera components.json, instala class-variance-authority/tailwind-merge/clsx/lucide-react
```
Para `vite-imagetools`, confirmar la última versión estable en `npmjs.com/package/vite-imagetools` antes de instalar (no fijar de memoria).

**Por qué GSAP y no Framer Motion/`motion`:** ambas son válidas, pero GSAP da control imperativo más fino para efectos tipo "glow que sigue al cursor" o timelines con múltiples pasos (elevación + sombra + brillo en secuencia), que es el tipo de efecto que Abraham pidió de ejemplo. Si en el futuro se prefiere una API más declarativa/React-idiomática, `motion` (antes `framer-motion`) es la alternativa — no instalar ambas a la vez, serían dos librerías de animación resolviendo el mismo problema.

## 3. Reglas de instalación
- Versión exacta, sin `^`/`~`, igual que el resto del proyecto (ver `04_STATUS.md`).
- Verificar la versión real en npmjs.com antes de escribir el `package.json` — no asumir de memoria.
- Cualquier librería nueva se justifica en `04_STATUS.md` al cerrarse la tarea, igual que el resto de decisiones de stack.

## 4. Tokens de diseño — extensión de `:root`
El `:root` actual solo tiene color y tipografía. Para animaciones/elevación se necesitan tokens de **duración**, **easing** y **sombra en capas** (una sola `box-shadow` se ve plana; la elevación creíble usa 2-3 capas). Añadir a `styles.css` (no reemplazar lo existente):

```css
:root {
  /* ...tokens existentes (--ink, --paper, --accent, etc.) sin tocar... */

  /* Elevación: sombras en capas, más realista que una sola box-shadow */
  --shadow-resting: 0 1px 2px rgba(20, 33, 31, 0.08), 0 1px 1px rgba(20, 33, 31, 0.06);
  --shadow-raised: 0 8px 24px rgba(20, 33, 31, 0.16), 0 2px 6px rgba(20, 33, 31, 0.10);
  --shadow-floating: 0 20px 48px rgba(20, 33, 31, 0.22), 0 4px 12px rgba(20, 33, 31, 0.12);

  /* Glow de acento (para el efecto "neón" bajo hover) */
  --glow-accent: 0 0 24px rgba(79, 122, 104, 0.55), 0 0 48px rgba(79, 122, 104, 0.25);

  /* Curvas de easing con personalidad, no solo ease/ease-in-out genéricos */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Duraciones consistentes en todo el proyecto */
  --dur-fast: 150ms;
  --dur-base: 280ms;
  --dur-slow: 480ms;
}
```
Regla: **todo nuevo efecto reutiliza estos tokens**, nunca hardcodea `0.3s ease` o un color de sombra suelto directamente en el componente.

## 5. Catálogo de efectos (recetario que el agente consulta bajo pedido)

### 5.1 Hover con elevación suave
- **Herramienta:** CSS puro (no necesita JS).
- **Propiedades animables sin costo de reflow:** solo `transform` y `opacity`/`box-shadow` (box-shadow no es GPU-accelerated puro, pero es aceptable en elementos pequeños tipo card).
```css
.project-card {
  box-shadow: var(--shadow-resting);
  transition: transform var(--dur-base) var(--ease-out-expo),
              box-shadow var(--dur-base) var(--ease-out-expo);
}
.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-raised);
}
```

### 5.2 Glow/neón debajo del hover (el ejemplo que dio Abraham)
- **Herramienta:** CSS puro con pseudo-elemento (más barato) o GSAP si el glow debe seguir la posición del cursor.
- **Versión CSS (glow estático bajo la card, se enciende con el hover):**
```css
.project-card {
  position: relative;
  isolation: isolate; /* evita que el glow se filtre a hermanos */
}
.project-card::after {
  content: "";
  position: absolute;
  inset: auto 10% -12px 10%;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  filter: blur(16px);
  opacity: 0;
  z-index: -1;
  transition: opacity var(--dur-base) var(--ease-out-expo);
}
.project-card:hover::after { opacity: 0.6; }
```
- **Versión GSAP (glow que sigue al cursor dentro de la card):**
```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

function useCursorGlow(cardRef: React.RefObject<HTMLElement>) {
  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;
    // Mueve una CSS custom property --mx/--my que el ::before usa como posición del glow.
    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      gsap.to(card, {
        "--mx": `${e.clientX - rect.left}px`,
        "--my": `${e.clientY - rect.top}px`,
        duration: 0.3,
        ease: "power2.out",
      });
    };
    card.addEventListener("pointermove", onMove);
    return () => card.removeEventListener("pointermove", onMove);
  }, []);
}
```
con el CSS correspondiente usando `radial-gradient(circle at var(--mx) var(--my), ...)`.

### 5.3 Contador animado (stat count-up)
- **Herramienta:** GSAP + ScrollTrigger.
- **Dónde aplica en este proyecto:** total recaudado en `ProjectDetail.tsx`, porcentaje de progreso en `ProjectCard.tsx`.
```tsx
useGSAP(() => {
  const counter = { val: 0 };
  gsap.to(counter, {
    val: targetValue,
    duration: 1.2,
    ease: "power2.out",
    scrollTrigger: { trigger: elRef.current, start: "top 85%", once: true },
    onUpdate: () => { if (elRef.current) elRef.current.textContent = counter.val.toFixed(4); },
  });
}, [targetValue]);
```

### 5.4 Transición de vista (list → detail → create)
- **Herramienta:** View Transitions API nativa, envolviendo el `setState` que cambia de vista en `App.tsx`.
```ts
function navigateTo(next: View) {
  if (!document.startViewTransition) { setView(next); return; }
  document.startViewTransition(() => { setView(next); });
}
```
Degrada limpio en navegadores sin soporte (cambia la vista igual, solo sin la transición).

### 5.5 Skeleton/shimmer mientras carga (lecturas de contrato)
- **Herramienta:** CSS puro (`@keyframes` con gradiente animado). Aplica en `ProjectList`/`ProjectDetail` mientras `useReadContracts` está en `isLoading`.
```css
@keyframes shimmer { to { background-position: -200% 0; } }
.skeleton {
  background: linear-gradient(90deg, var(--line) 25%, #ece9df 37%, var(--line) 63%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
```

### 5.6 Botón "magnético" (se acerca sutilmente al cursor)
- **Herramienta:** GSAP (necesita seguir el puntero en tiempo real).
- **Dónde aplica:** CTAs principales (Pledge, Crear proyecto, Conectar wallet).
```tsx
useGSAP(() => {
  const btn = btnRef.current;
  if (!btn) return;
  const onMove = (e: PointerEvent) => {
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
    gsap.to(btn, { x, y, duration: 0.3, ease: "power2.out" });
  };
  const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: "elastic.out(1, 0.5)" }); // equivalente a --ease-spring en JS
  btn.addEventListener("pointermove", onMove);
  btn.addEventListener("pointerleave", onLeave);
  return () => { btn.removeEventListener("pointermove", onMove); btn.removeEventListener("pointerleave", onLeave); };
}, []);
```

### 5.7 Reveal escalonado (stagger) al entrar en viewport
- **Herramienta:** GSAP + ScrollTrigger, `stagger`.
- **Dónde aplica:** grid de `ProjectList` al cargar/hacer scroll.
```tsx
useGSAP(() => {
  gsap.from(".project-card", {
    opacity: 0,
    y: 24,
    duration: 0.6,
    ease: "power2.out",
    stagger: 0.08,
    scrollTrigger: { trigger: gridRef.current, start: "top 85%" },
  });
}, []);
```

### 5.8 Borde con gradiente animado (para estados "en curso"/destacado)
- **Herramienta:** CSS puro, `@property` + `conic-gradient` girando.
```css
@property --angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
.project-card.featured {
  border: 2px solid transparent;
  background:
    linear-gradient(var(--paper), var(--paper)) padding-box,
    conic-gradient(from var(--angle), var(--accent), var(--accent-strong), var(--accent)) border-box;
  animation: spin-border 3s linear infinite;
}
@keyframes spin-border { to { --angle: 360deg; } }
```

## 6. Checklist obligatorio antes de dar por terminado un efecto
1. **`prefers-reduced-motion`:** toda animación con movimiento/parallax debe respetar esta media query.
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
   En GSAP: usar `gsap.matchMedia()` para desactivar timelines completas si aplica, no solo acortar duración.
2. **Solo animar `transform`/`opacity`** cuando el efecto deba correr a 60fps (evita animar `width`/`top`/`left`, que fuerzan reflow).
3. **Cleanup de listeners/GSAP context:** todo `useGSAP` con listeners de `pointermove` debe limpiar en el return del hook (ya reflejado en los snippets de arriba) — evita leaks al desmontar `ProjectCard`.
4. **No bloquear la lógica de estados de Fase 5:** los efectos visuales se aplican sobre el resultado de `useProjectStatus`/`useNetworkStatus`, nunca lo reemplazan ni introducen un segundo cálculo de "¿está desplegado en esta red?" duplicado.
5. **Bundle size:** si se importa GSAP solo para un hover simple, preferir la versión CSS del catálogo (§5.1/§5.2 versión CSS) — GSAP se reserva para lo que CSS no puede (seguir cursor, timelines secuenciadas, scroll-trigger).

## 7. Bloques de trabajo sugeridos (activar bajo demanda, no es un roadmap obligatorio)
- **Bloque A — Fundaciones:** instalar GSAP/`@gsap/react`, añadir tokens de §5 a `styles.css`, crear `frontend/src/hooks/useCursorGlow.ts` y `useMagneticHover.ts` como hooks reutilizables.
- **Bloque B — `ProjectCard`/`ProjectList`:** hover elevación (§5.1), glow (§5.2), stagger reveal (§5.7), skeleton mientras carga (§5.5).
- **Bloque C — `ProjectDetail`:** contador animado del monto recaudado (§5.3), borde animado si `isSuccessful` (§5.8).
- **Bloque D — CTAs (`PledgeForm`, `CreateProjectForm`, `ConnectWallet`):** botón magnético (§5.6), estados de carga con shimmer.
- **Bloque E — Navegación (`App.tsx`):** View Transitions API entre list/detail/create (§5.4).

Cada bloque es independiente — Abraham puede pedir "solo el Bloque B" o un efecto suelto de §5 sin necesidad de pasar por los demás.

## 8. Actualización de este documento
Cuando se instale una librería nueva o se descarte alguna de las recomendadas aquí, documentar la decisión en este archivo (no solo en `04_STATUS.md`), para que quede como la fuente de verdad de "qué herramientas visuales están realmente en el proyecto" vs. "qué se evaluó y no se usó".

## 9. Landing Hero + carruseles infinitos (PLANIFICADO, no ejecutado aún — 2026-07-10)

Abraham pidió diseñar e implementar el Hero principal de la landing: 3
"infinite marquees" verticales de imagenes de proyectos reales, con
direcciones alternadas, sin librerias de carrusel de terceros. El prompt
completo y detallado con el que se va a ejecutar esta tarea vive fuera del
repo (se le entrego a Abraham como archivo descargable,
`prompt_hero_landing_adaptado.txt`, adaptado desde un PDF de referencia que
el trajo) — este §9 es el resumen que debe quedar versionado en el repo
para que cualquier agente futuro tenga el contexto sin depender de ese
archivo externo.

### 9.1 Decisiones de stack que esto introduce (actualizan §1/§2 de este documento)
- **Tailwind CSS v4 + shadcn/ui: SE INSTALAN.** Motivo explicito de Abraham:
  aprendizaje de ambas herramientas, no una necesidad tecnica del Hero en si
  (el marquee se puede hacer igual de bien en CSS vanilla). Mapear el
  `@theme` de Tailwind sobre los tokens YA existentes en `styles.css`
  (`--ink`, `--paper`, `--accent`, `--accent-strong`, `--shadow-*`,
  `--ease-*`, `--dur-*`) en vez de crear una paleta Tailwind paralela.
  `shadcn/ui` se usa en piezas puntuales (ej. boton del CTA), no en el
  marquee, que sigue siendo un componente propio.
- El marquee en si sigue usando **GSAP** (ya decidido en §2), no Framer
  Motion ni ninguna libreria de carrusel (Swiper/Slick/Owl Carousel quedan
  explicitamente prohibidas para esto).
- **React Router sigue sin instalarse** para esta tarea. El Hero se integra
  como una vista mas del `useState` de navegacion que ya tiene `App.tsx`
  (o se decide en el momento de implementar si amerita algo distinto),
  consistente con la razon ya documentada en `03_PLAN_FASES.md` de por que
  el proyecto no usa una libreria de rutas con pocas pantallas.

### 9.2 Contenido de las imagenes
Las fotos que van en los 3 carruseles son **proyectos reales curados a mano
por Abraham**, no stock generico ni contenido generado por IA. Se colocan en
`frontend/src/assets/` (carpeta ya creada en el repo, hoy vacia) y se
importan de forma estatica (`import img from "../../assets/..."`), nunca
desde IPFS ni desde un gateway remoto — eso es a proposito distinto del
flujo real de imagenes de campañas (`usePinataUpload.ts`,
`ProjectCard.tsx`/`ProjectDetail.tsx`), que no se toca en esta tarea. Como
la carpeta esta vacia hoy, la lista de imagenes (`showcase.data.ts`) se
define como imports explícitos que Abraham va completando a mano a medida
que agrega archivos, no con un glob dinamico que oculte que imagenes
existen en cada momento.

### 9.3 Componentes nuevos previstos (no colisionan con la dApp real)
```
frontend/
  components.json              (config de shadcn/ui)
  src/
    components/
      ui/                       (componentes generados por la CLI de shadcn/ui)
      landing/
        Hero.tsx
        CarouselRow.tsx
        ShowcaseCard.tsx        (distinto de ProjectCard.tsx, que SI depende del contrato)
        LandingCTA.tsx
    hooks/
      useInfiniteMarquee.ts     (nuevo, sigue el patron de useCursorGlow/useMagneticHover de §7 Bloque A)
    data/
      showcase.data.ts
    types/
      landing.ts
    lib/
      utils.ts                  (helper cn() que shadcn/ui espera)
```
`landing/` queda separado del resto de `components/` a proposito: es
contenido curado sin dependencia de wagmi/viem/lecturas on-chain, mientras
que el resto de la dApp (`ProjectCard`, `ProjectDetail`, los hooks de
escritura) si depende del contrato. Esto deja claro que se puede iterar
libremente sobre `landing/` sin riesgo de tocar logica de fondos.

### 9.4 Requisitos duros que la implementacion debe cumplir (resumen del prompt completo)
- 60 FPS incluso en dispositivos modestos; movimiento basado en
  `transform: translate3d()`, nunca en rerenders de React ni `setInterval`.
- Loop infinito sin salto perceptible (duplicar el set de items, sin
  detectar el "final" de la lista).
- Pausar las animaciones de GSAP cuando el Hero sale del viewport
  (Intersection Observer / ScrollTrigger), nunca listeners de scroll manuales.
- Respetar `prefers-reduced-motion` con `gsap.matchMedia()` (§6.1 de este
  documento), mostrando una version estatica sin loop.
- Lighthouse Performance/Accessibility/Best Practices/SEO objetivo ≥95.

### 9.5 Estado — CERRADO (2026-07-11)
Implementado en `/frontend` tal como estaba planificado, sin desvios de
diseno:

- **Dependencias instaladas** (versiones exactas verificadas en npmjs.com el
  mismo dia): `gsap@3.15.0`, `@gsap/react@2.1.2`, `tailwindcss@4.3.2` +
  `@tailwindcss/vite@4.3.2` (dev), `class-variance-authority@0.7.1`,
  `clsx@2.1.1`, `tailwind-merge@3.6.0`, `lucide-react@1.24.0`.
- **`vite.config.ts`**: se agrego el plugin `@tailwindcss/vite` (procesa el
  `@import "tailwindcss"` de `styles.css`) y el alias `@` -> `src`, requerido
  por la convencion de imports de shadcn/ui (`@/lib/utils`).
- **`tsconfig.json`**: `baseUrl`/`paths` con el mismo alias `@/*`, para que
  TS resuelva lo que Vite ya resuelve en build.
- **`components.json`**: agregado para dejar el proyecto alineado con lo que
  generaria la CLI de shadcn/ui, aunque `button.tsx` se escribio a mano.
- **`styles.css`**: `@theme` mapea `--color-*` sobre los tokens ya
  existentes (`--ink`, `--paper`, `--accent`, etc.) y reexpone
  `--shadow-*`/`--ease-*` en el mismo bloque para que ambos mundos (CSS
  vanilla via `var()` y utilities de Tailwind) lean el mismo valor sin
  duplicarlo.
- **`useInfiniteMarquee.ts`**: loop infinito via `gsap.fromTo(xPercent)` con
  `repeat: -1` sobre un track duplicado (patron seamless-marquee estandar),
  pausado/reanudado con `IntersectionObserver` (no `ScrollTrigger`: este caso
  solo necesita on/off, no timing relativo al scroll — KISS) y sin
  `setInterval`/rAF manual.
- **`CarouselRow.tsx`**: en `prefers-reduced-motion: reduce` renderiza un
  grid estatico sin duplicar (no solo acorta duraciones), y el marquee real
  se marca `aria-hidden` por ser contenido decorativo duplicado.
- **`ShowcaseCard.tsx`**: hover solo con `transform`/`box-shadow`
  (`--shadow-raised`, `--ease-out-expo`), `loading="lazy"` salvo las primeras
  3 imagenes de cada fila (`priority`, `loading="eager"` + `fetchPriority="high"`).
- **`showcase.data.ts`**: imports estaticos explicitos desde `src/assets/`
  (15 imagenes disponibles hoy), 2 archivos descartados a proposito por no
  ser fotos de proyecto (ver comentario en el archivo) — pendiente que
  Abraham reemplace el resto por fotografia propia curada, hoy son en su
  mayoria descargas genericas.
- **No se instalo React Router ni ninguna libreria de carrusel de terceros.**
  El Hero es la vista `"home"` del mismo `useState` de `App.tsx`.
- **Pendiente real, no bloqueante:** medir Lighthouse una vez Abraham corra
  `npm run build`/`preview` localmente (no verificable desde este entorno,
  ver limitacion de `npm run lint`/`build` ya documentada en `04_STATUS.md`).
