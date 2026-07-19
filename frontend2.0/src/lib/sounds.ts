import backSrc from "@/assets/sounds/gta-menu.mp3";
import navigateSrc from "@/assets/sounds/gta-sa-menu.mp3";
import successSrc from "@/assets/sounds/gta-san-andreas-abertura-oficial.mp3";
import deleteSrc from "@/assets/sounds/big_smoke_oh_my_god.mp3";

// Migrated 1:1 from frontend/src/lib/sounds.ts (docs/08_FRONTEND_MIGRATION.md).
// Only change: asset imports via the "@/assets/..." alias instead of the
// relative "../assets/..." (same destination folder: src/assets/sounds/).
//
// One base <audio> per effect, reused across calls. Each playback clones the
// node: if the user clicks fast, the new sound doesn't cut off the previous one.
function createPlayer(src: string) {
  // SSR guard: in TanStack Start's first render (server) `Audio` (a browser
  // API) doesn't exist. This didn't exist in the old frontend because it was
  // an SPA with no server render; it's the only adaptation needed so this
  // module doesn't break the SSR build.
  if (typeof Audio === "undefined") {
    return () => {};
  }
  const base = new Audio(src);
  base.preload = "auto";
  return () => {
    const instance = base.cloneNode(true) as HTMLAudioElement;
    // Browsers block autoplay without prior interaction; since this always
    // runs inside an onClick, the rejection is still caught in case the
    // browser blocks it anyway (avoids a console error).
    instance.play().catch(() => {});
  };
}

/** Go back / decline / cancel an action. */
export const playBackSound = createPlayer(backSrc);
/** Enter/advance to a section of the project (Explore, Create, view detail). */
export const playNavigateSound = createPlayer(navigateSrc);
/** Project creation transaction confirmed successfully. */
export const playSuccessSound = createPlayer(successSrc);
/** The user deleted a project. */
export const playDeleteSound = createPlayer(deleteSrc);
