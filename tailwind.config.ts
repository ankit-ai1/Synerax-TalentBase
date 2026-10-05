import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: v("ink-800"),
          900: v("ink-900"),
          800: v("ink-800"),
          700: v("ink-700"),
          600: v("ink-600"),
          500: v("ink-500"),
          400: v("ink-400"),
          300: v("ink-300"),
        },
        canvas: v("canvas"),
        surface: { DEFAULT: v("surface"), 2: v("surface-2"), 3: v("surface-3") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        sidebar: { DEFAULT: v("sidebar"), line: v("sidebar-line"), text: v("sidebar-text"), muted: v("sidebar-muted") },
        jade: {
          DEFAULT: v("jade"),
          50: v("jade-50"),
          100: v("jade-100"),
          600: v("jade"),
          700: v("jade-700"),
        },
        saffron: {
          DEFAULT: v("saffron"),
          50: v("saffron-50"),
          100: v("saffron-100"),
          600: v("saffron-600"),
          800: v("saffron-800"),
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        glow: "0 0 0 1px rgb(var(--jade) / 0.25), 0 8px 24px -8px rgb(var(--jade) / 0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "pop-in": "pop-in 160ms cubic-bezier(.2,.8,.2,1)",
        "slide-in": "slide-in 220ms cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
};
export default config;
