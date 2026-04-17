/**
 * Public profile themes: gradient stops, CTA/button color, and text mode.
 * Legacy theme ids map to the closest new preset.
 */
export const PROFILE_THEMES = [
  {
    id: "obsidian-pulse",
    label: "Obsidian Pulse",
    from: "#0D0D1A",
    to: "#1a0533",
    button: "#6C63FF",
    text: "white"
  },
  {
    id: "cyber-neon",
    label: "Cyber Neon",
    from: "#001a2c",
    to: "#000d1a",
    button: "#00D4FF",
    text: "white"
  },
  {
    id: "minimal-light",
    label: "Minimal Light",
    from: "#f8fafc",
    to: "#e2e8f0",
    button: "#0f172a",
    text: "dark"
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    from: "#1a0010",
    to: "#2d0021",
    button: "#FF3CAC",
    text: "white"
  },
  {
    id: "forest",
    label: "Forest",
    from: "#0a1a0a",
    to: "#0d2b0d",
    button: "#39FF14",
    text: "white"
  },
  {
    id: "ocean-deep",
    label: "Ocean Deep",
    from: "#001233",
    to: "#001f54",
    button: "#3b82f6",
    text: "white"
  },
  {
    id: "sunset",
    label: "Sunset",
    from: "#1a0a00",
    to: "#2d1500",
    button: "#f97316",
    text: "white"
  },
  {
    id: "purple-haze",
    label: "Purple Haze",
    from: "#1a0033",
    to: "#0d001a",
    button: "#a855f7",
    text: "white"
  },
  {
    id: "arctic",
    label: "Arctic",
    from: "#e8f4f8",
    to: "#d0e8f0",
    button: "#14b8a6",
    text: "dark"
  },
  {
    id: "gold-rush",
    label: "Gold Rush",
    from: "#1a1200",
    to: "#2d2000",
    button: "#FFD700",
    text: "white"
  }
];

const LEGACY_THEME_MAP = {
  "violet-mist": "purple-haze",
  "ocean-cyan": "ocean-deep",
  "sunset-rose": "rose-gold",
  "emerald-night": "forest",
  "royal-indigo": "purple-haze",
  carbon: "obsidian-pulse",
  "gold-noir": "gold-rush"
};

export function getProfileTheme(themeId) {
  const id = String(themeId || "").trim();
  const resolved = LEGACY_THEME_MAP[id] || id;
  const found = PROFILE_THEMES.find((t) => t.id === resolved);
  return found || PROFILE_THEMES[0];
}

export function themeGradientCSS(theme) {
  const t = typeof theme === "string" ? getProfileTheme(theme) : theme;
  return `linear-gradient(180deg, ${t.from} 0%, ${t.to} 100%)`;
}
