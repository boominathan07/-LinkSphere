import { getProfileTheme, themeGradientCSS } from "./profileThemes";

/** Page background: theme gradient + subtle wash. */
export function getPublicPageBackground(user) {
  const t = getProfileTheme(user?.theme);
  const gradient = themeGradientCSS(t);
  const tint = user?.customBgColor;
  const hasHex = tint && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(tint).trim());
  const wash = hasHex
    ? `radial-gradient(ellipse 100% 60% at 50% 0%, ${String(tint).trim()}33 0%, transparent 55%), `
    : "";
  const glow =
    t.text === "white"
      ? `radial-gradient(ellipse 120% 80% at 50% -15%, rgb(108 99 255 / 0.12), transparent 45%), `
      : `radial-gradient(ellipse 100% 80% at 50% 0%, rgb(15 23 42 / 0.08), transparent 50%), `;
  return {
    backgroundImage: `${wash}${glow}${gradient}`,
    backgroundAttachment: "fixed",
    backgroundColor: t.text === "dark" ? t.from : "#0D0D1A",
    minHeight: "100vh"
  };
}

/** Primary accent for rings, glows, and CTA buttons. */
export function getThemeAccent(user) {
  return getProfileTheme(user?.theme).button;
}

export function isLightProfileTheme(user) {
  return getProfileTheme(user?.theme).text === "dark";
}
