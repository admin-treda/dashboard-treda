import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Neon palette */
        "neon-cyan": "hsl(var(--neon-cyan))",
        "neon-blue": "hsl(var(--neon-blue))",
        "neon-purple": "hsl(var(--neon-purple))",
        "neon-yellow": "hsl(var(--neon-yellow))",
        "neon-green": "hsl(var(--neon-green))",
        "neon-red": "hsl(var(--neon-red))",
        "neon-orange": "hsl(var(--neon-orange))",
        "neon-magenta": "hsl(var(--neon-magenta))",
        /* Steampunk metals */
        brass: "hsl(var(--brass))",
        copper: "hsl(var(--copper))",
        bronze: "hsl(var(--bronze))",
        gunmetal: "hsl(var(--gunmetal))",
        /* Severity */
        critical: "hsl(var(--severity-critical))",
        high: "hsl(var(--severity-high))",
        medium: "hsl(var(--severity-medium))",
        low: "hsl(var(--severity-low))",
        /* Status */
        online: "hsl(var(--status-online))",
        warning: "hsl(var(--status-warning))",
        offline: "hsl(var(--status-offline))",
        running: "hsl(var(--status-running))",
        /* Text hierarchy */
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-muted": "hsl(var(--text-muted))",
        "text-dim": "hsl(var(--text-dim))",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "'Inter'", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px hsl(var(--neon-cyan) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--neon-cyan) / 0.2)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.8s infinite ease-in-out",
        "fade-in": "fade-in 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in": "slide-in 0.25s ease-out",
        "scale-in": "scale-in 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
