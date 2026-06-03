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
        /* CYBERPUNK Neon Palette */
        "neon-cyan": "hsl(var(--neon-cyan))",
        "neon-pink": "hsl(var(--neon-pink))",
        "neon-purple": "hsl(var(--neon-purple))",
        "neon-yellow": "hsl(var(--neon-yellow))",
        "neon-green": "hsl(var(--neon-green))",
        "neon-red": "hsl(var(--neon-red))",
        /* STEAMPUNK Accents */
        "brass": "hsl(var(--brass))",
        "copper": "hsl(var(--copper))",
        "bronze": "hsl(var(--bronze))",
        /* Aliases for backward compat */
        "accent-cyan": "hsl(var(--neon-cyan))",
        "accent-lime": "hsl(var(--neon-green))",
        "primary-navy": "hsl(var(--neon-purple))",
        /* Severity colors */
        critical: "hsl(345 100% 50%)",
        high: "hsl(25 100% 55%)",
        medium: "hsl(280 100% 60%)",
        low: "hsl(120 100% 50%)",
        warning: "hsl(45 100% 50%)",
      },
      fontFamily: {
        sans: ["'Rajdhani'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'Share Tech Mono'", "ui-monospace", "monospace"],
        display: ["'Orbitron'", "system-ui", "sans-serif"],
        cyber: ["'Orbitron'", "sans-serif"],
        steam: ["'Cinzel Decorative'", "serif"],
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
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 15px hsl(var(--neon-cyan) / 0.2)" },
          "50%": { boxShadow: "0 0 30px hsl(var(--neon-cyan) / 0.4)" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(var(--neon-cyan) / 0.15)" },
          "50%": { borderColor: "hsl(var(--neon-cyan) / 0.35)" },
        },
        "gradient-slide": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "gradient-slide": "gradient-slide 4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;