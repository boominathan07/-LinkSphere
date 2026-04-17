/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0D0D1A",
        surface: "#0F172A",
        elevated: "#161B2E",
        hover: "#1E293B",
        "accent-violet": "#6C63FF",
        "accent-cyan": "#00D4FF",
        "accent-lime": "#39FF14",
        "accent-rose": "#FF3CAC",
        "accent-gold": "#FFD700",
        "text-primary": "#F1F5F9",
        "text-muted": "#94A3B8",
        border: "#1E293B",
        // Legacy aliases used across existing UI classes
        "bg-base": "#0D0D1A",
        "bg-surface": "#0F172A",
        "bg-elevated": "#161B2E",
        "border-default": "#1E293B",
        "accent-violet-soft": "#6C63FF"
      },
      fontFamily: {
        display: ["Clash Display", "system-ui", "-apple-system", "sans-serif"],
        body: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      },
      boxShadow: {
        glow: "0 0 15px rgb(108 99 255 / 0.3)",
        cyan: "0 0 16px rgb(0 212 255 / 0.25)"
      },
      backdropBlur: {
        glass: "24px"
      }
    }
  },
  plugins: []
};
