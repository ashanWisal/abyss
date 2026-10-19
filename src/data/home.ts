/**
 * Home page content — the dive, the creatures, the zones and the credits.
 * The dive — "The Signal" — is rendered live in WebGL (src/views/home/descent/);
 * this module holds its story copy and each chapter's depth range.
 */

/** Accessible name of the dive section. */
export const diveLabel =
  "The Signal: a probe follows a mysterious light pulse down through the twilight and midnight zones to a giant glowing creature on the sea floor";

export interface ChapterContent {
  id: string;
  /** "01" … shown in the chapter mark. */
  index: string;
  zone: string;
  headlineLines: string[];
  body: string;
  /** Depth range this chapter descends through, metres. */
  depthFrom: number;
  depthTo: number;
  /** Readouts in the bottom ticker. */
  readouts: string[];
  /**
   * Where the headline sits — each chapter takes a different corner, away
   * from the probe and that chapter's set piece; the body takes the
   * opposite bottom corner.
   */
  layout: "bottom-left" | "top-right" | "bottom-right" | "top-left";
}

export const chapters: ChapterContent[] = [
  {
    id: "signal",
    layout: "bottom-left",
    index: "01",
    zone: "Signal received · Sunlight zone",
    headlineLines: ["Something down", "there is calling."],
    body: "04:12 — the probe picks up a light pulse from 4 000 metres. Three short, one long, over and over. Nothing down there should be doing that. Scroll to dive. Move the mouse to aim the searchlight.",
    depthFrom: 0,
    depthTo: 200,
    readouts: ["Signal 12%", "Pattern · · · —", "Bearing 041°", "0 – 200 m", "24 °C", "Light 100%"],
  },
  {
    id: "pulse",
    layout: "top-left",
    index: "02",
    zone: "Following the pulse · Twilight zone",
    headlineLines: ["The light fades.", "The signal doesn't."],
    body: "Below 200 metres the sun gives up. A sperm whale glides past on its way down to hunt and doesn't spare us a look. The pulse keeps coming, a little stronger.",
    depthFrom: 200,
    depthTo: 1000,
    readouts: ["Signal 25%", "Pattern · · · —", "200 – 1000 m", "12 °C", "Light 1%", "Sperm whale on sonar"],
  },
  {
    id: "answer",
    layout: "bottom-right",
    index: "03",
    zone: "Something answered · Midnight zone",
    headlineLines: ["We flashed back.", "Something answered."],
    body: "Out here almost everything makes its own light. An anglerfish dangles a lure that blinks in our rhythm — a perfect copy, and a trap. It isn't the source. The real signal is still below us.",
    depthFrom: 1000,
    depthTo: 4000,
    readouts: ["Signal 45%", "Mimic detected", "1000 – 4000 m", "4 °C", "Light 0%", "Do not follow the lure"],
  },
  {
    id: "source",
    layout: "top-right",
    index: "04",
    zone: "The source · The floor",
    headlineLines: ["It was never", "a machine."],
    body: "Between the vents, something enormous is glowing — three short, one long. It has been calling the whole time. We still don't know who it was calling.",
    depthFrom: 4000,
    depthTo: 4200,
    readouts: ["Signal 100%", "Source located", "4 200 m", "2 °C", "Hydrothermal vents", "Contact"],
  },
];

export interface Creature {
  name: string;
  /** Model in `public/models/` — the same one the dive uses. */
  model: "fish" | "whale" | "jelly" | "angler" | "squid";
  /** Emissive tint for its light organs, if it glows. */
  glow?: string;
  /** Only these materials glow; default all. */
  glowOnly?: string[];
  /** Where the probe met it. */
  zone: string;
  depth: string;
  size: string;
  fact: string;
}

export const creaturesContent = {
  eyebrow: "Field log",
  heading: "What we met on the way down",
  labels: { zone: "Zone", depth: "Met at", size: "Size" },
  creatures: [
    { name: "Silver fish school", model: "fish", zone: "Sunlight", depth: "30 m", size: "15 cm each", fact: "Thousands move as one body. When the searchlight hit them, the whole school split and closed again." },
    { name: "Sperm whale", model: "whale", zone: "Twilight", depth: "520 m", size: "16 m", fact: "Dives to 2 000 m to hunt squid, holding its breath for over an hour. It ignored the probe completely." },
    { name: "Deep-sea jellyfish", model: "jelly", glow: "#c7a6ff", zone: "Twilight – Midnight", depth: "280 – 3 500 m", size: "10 – 40 cm", fact: "Makes its own light. Ours flared when the beam touched them, then drifted out of it." },
    { name: "Anglerfish", model: "angler", glow: "#9ffff0", glowOnly: ["Light", "Anglerfish_Light"], zone: "Midnight", depth: "2 350 m", size: "20 cm", fact: "Hunts with a glowing lure on its head. This one copied our signal to pull us in — the false lead." },
    { name: "Giant squid", model: "squid", zone: "Midnight", depth: "3 150 m", size: "Up to 13 m", fact: "Has the largest eyes of any animal, the size of a dinner plate. It jetted away the moment it was lit." },
    { name: "The source", model: "jelly", glow: "#5ef2d6", zone: "Abyss", depth: "4 200 m", size: "Unknown", fact: "A colossal jellyfish pulsing three short, one long. The signal we followed all the way down." },
  ] satisfies Creature[],
};

export interface DepthZone {
  name: string;
  scientificName: string;
  range: string;
  fact: string;
}

export const zonesContent = {
  eyebrow: "The water column",
  heading: "Five layers, one ocean",
  zones: [
    { name: "Sunlight", scientificName: "Epipelagic", range: "0 – 200 m", fact: "Enough light for photosynthesis. Almost all the life you know lives here." },
    { name: "Twilight", scientificName: "Mesopelagic", range: "200 – 1000 m", fact: "A dim blue dusk. Billions of animals migrate up and down it every night." },
    { name: "Midnight", scientificName: "Bathypelagic", range: "1000 – 4000 m", fact: "Total darkness. The only light comes from the animals themselves." },
    { name: "Abyss", scientificName: "Abyssopelagic", range: "4000 – 6000 m", fact: "Near-freezing, crushing pressure, and plains of silt that cover half the planet." },
    { name: "Trenches", scientificName: "Hadal", range: "6000 – 10 935 m", fact: "Canyons deeper than Everest is tall. Fewer people have been here than to the Moon." },
  ] satisfies DepthZone[],
};

export interface OceanStat {
  value: string;
  label: string;
}

export const statsContent = {
  eyebrow: "By the numbers",
  heading: "An ocean we barely know",
  stats: [
    { value: "10 935 m", label: "Deepest point ever measured, Challenger Deep" },
    { value: "80%", label: "Of the ocean still unmapped and unexplored" },
    { value: "76%", label: "Of open-ocean animals that make their own light" },
    { value: "1 000+ atm", label: "Pressure at the bottom of the trenches" },
  ] satisfies OceanStat[],
};

export interface Credit {
  title: string;
  author: string;
  href: string;
}

export const footerContent = {
  runningLine: "The signal is still out there",
  cta: "Write to the crew",
  email: "crew@abyss.dive",
  blurb: "The Signal — a scroll-driven WebGL dive. A frontend practice project.",
  creditsHeading: "3D models — CC BY / public domain",
  credits: [
    { title: "Submarine, Sperm Whale, Jellyfish, Squid", author: "Poly by Google (CC BY)", href: "https://poly.pizza/u/Poly%20by%20Google" },
    { title: "Fish, Anglerfish, Shark, Rocks", author: "Quaternius (public domain)", href: "https://poly.pizza/u/Quaternius" },
  ] satisfies Credit[],
  backToTop: "Back to the surface ↑",
};

export const headerContent = {
  name: "Abyss",
  nav: [
    { label: "Creatures", href: "#creatures" },
    { label: "Zones", href: "#zones" },
    { label: "Numbers", href: "#numbers" },
  ],
  cta: { label: "Join a dive", href: "#contact" },
  depthLabel: "Depth",
  signalLabel: "Signal",
};
