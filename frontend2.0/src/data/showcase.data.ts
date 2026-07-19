import type { ShowcaseItem } from "@/types/landing";

// Migrated 1:1 from frontend/src/data/showcase.data.ts (docs/08_FRONTEND_MIGRATION.md).
// Static imports (no dynamic glob): Vite optimizes/hashes each file at
// build time and it stays explicit in the code which images exist at any
// given moment. Abraham keeps adding more photos to src/assets/ and
// completes this list by hand (docs/06_FRONTEND_VISUAL_UPGRADE.md §9.2).
import apple18 from "@/assets/apple18-450x336.jpg";
import baglietto46m from "@/assets/baglietto46m_c2101_r1341736.avif";
import descarga1 from "@/assets/descarga (1).jpeg";
import descarga2 from "@/assets/descarga (2).jpeg";
import descarga3 from "@/assets/descarga (3).jpeg";
import descarga4 from "@/assets/descarga (4).jpeg";
import descarga5 from "@/assets/descarga (5).jpeg";
import descarga0 from "@/assets/descarga.jpeg";
import images1 from "@/assets/images (1).jpeg";
import images2 from "@/assets/images (2).jpeg";
import images3 from "@/assets/images (3).jpeg";
import images4 from "@/assets/images (4).jpeg";
import images5 from "@/assets/images (5).jpeg";
import imagesJpeg from "@/assets/images.jpeg";
import imagesPng from "@/assets/images.png";

// PENDING (confirm with Abraham, see docs/06_FRONTEND_VISUAL_UPGRADE.md §9.2):
// 2 files that were in assets/ were deliberately excluded when inspecting
// this folder: "maxresdefault.jpg" (a YouTube thumbnail name/format,
// not a project photo) and "top-15-juegos-de-plataformas-en-3d_mqmn.jpg"
// (a video game listing thumbnail - violates the Hero's explicit
// "nothing childish / no gaming" rule). They stayed in frontend/src/assets/
// (not moved to frontend2.0) because they aren't used anywhere. If any of
// them IS actually a real project photo, add it here by hand.
//
// The rest of the filenames ("descarga*.jpeg", "images*.jpeg/png") are the
// default names the browser gives when downloading from Google Images: they
// are likely generic stock photos, not Abraham's own curated photography as
// the Hero spec requires. Each item's `alt` describes the observed visual
// content without claiming these are "real projects funded on the
// platform" - replace with real photography once available.
export const showcaseItems: ShowcaseItem[] = [
  { id: "apple18", src: apple18, category: "agriculture", alt: "Apple orchard with ripe fruit" },
  { id: "baglietto46m", src: baglietto46m, category: "infrastructure", alt: "Rendering of a large vessel" },
  { id: "descarga1", src: descarga1, category: "technology", alt: "Close-up of an electronic circuit" },
  { id: "descarga2", src: descarga2, category: "energy", alt: "Solar panel plant" },
  { id: "descarga3", src: descarga3, category: "medicine", alt: "Medical laboratory equipment" },
  { id: "descarga4", src: descarga4, category: "infrastructure", alt: "Construction crane at a job site" },
  { id: "descarga5", src: descarga5, category: "robotics", alt: "Industrial robotic arm" },
  { id: "descarga0", src: descarga0, category: "architecture", alt: "Facade of a modern building" },
  { id: "images1", src: images1, category: "education", alt: "Educational space" },
  { id: "images2", src: images2, category: "finance", alt: "Financial data panel or chart" },
  { id: "images3", src: images3, category: "startup", alt: "Team working in an office" },
  { id: "images4", src: images4, category: "ai", alt: "Abstract visualization of a neural network" },
  { id: "images5", src: images5, category: "agriculture", alt: "Agricultural crop field" },
  { id: "imagesJpeg", src: imagesJpeg, category: "technology", alt: "Technology-related image" },
  { id: "imagesPng", src: imagesPng, category: "energy", alt: "Energy-related image" },
];

// Distribution across 3 rows of 5 items, mixing categories per row so each
// carousel looks varied instead of grouping the same category together.
export const carouselRows: ShowcaseItem[][] = [
  [showcaseItems[0], showcaseItems[2], showcaseItems[9], showcaseItems[1], showcaseItems[11]],
  [showcaseItems[3], showcaseItems[8], showcaseItems[7], showcaseItems[12], showcaseItems[6]],
  [showcaseItems[4], showcaseItems[10], showcaseItems[5], showcaseItems[13], showcaseItems[14]],
];
