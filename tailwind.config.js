/** Dantola Dental Clinic - Tailwind config built from the
 *  "Vibrant Clinical Precision" design system token sheet.
 *  Every value below is taken verbatim from that spec; nothing is invented.
 */
module.exports = {
  content: ["./*.html", "./src/**/*.html", "./assets/js/*.js"],
  theme: {
    extend: {
      colors: {
        /* --- surface ramp */
        surface: {
          DEFAULT: "#faf8ff",
          dim: "#d2d9f4",
          bright: "#faf8ff",
          lowest: "#ffffff",
          low: "#f2f3ff",
          container: "#eaedff",
          high: "#e2e7ff",
          highest: "#dae2fd",
          variant: "#dae2fd",
        },
        "on-surface": { DEFAULT: "#131b2e", variant: "#43474d" },
        "inverse-surface": "#283044",
        "inverse-on-surface": "#eef0ff",
        outline: { DEFAULT: "#74777e", variant: "#c4c6ce" },
        "surface-tint": "#49607e",
        "on-background": "#131b2e",

        /* --- primary (medical navy) */
        primary: {
          DEFAULT: "#000f22",
          muted: "#0a2540",
          container: "#0a2540",
          "on-container": "#768dad",
          "fixed": "#d2e4ff",
          "fixed-dim": "#b0c8eb",
        },
        "inverse-primary": "#b0c8eb",

        /* --- "on-" roles as flat token names, exactly as the design sheet lists them */
        "on-primary": "#ffffff",
        "on-primary-container": "#768dad",
        "on-primary-fixed": "#001c37",
        "on-primary-fixed-variant": "#314865",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#007071",
        "on-secondary-fixed": "#002020",
        "on-secondary-fixed-variant": "#004f50",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#009e6d",
        "on-tertiary-fixed": "#002113",
        "on-tertiary-fixed-variant": "#005236",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        /* --- secondary (vibrant cyan / turquoise) */
        secondary: {
          DEFAULT: "#006a6a",
          container: "#56f9f9",
          "on-container": "#007071",
          fixed: "#56f9f9",
          "fixed-dim": "#26dcdd",
        },

        /* --- tertiary (mint / seafoam) */
        tertiary: {
          DEFAULT: "#001209",
          container: "#002a1a",
          "on-container": "#009e6d",
          fixed: "#6ffbbe",
          "fixed-dim": "#4edea3",
        },

        /* --- alerts & triage */
        error: { DEFAULT: "#ba1a1a", container: "#ffdad6", "on-container": "#93000a" },

        /* --- practical brand ramps named in the style guide */
        brand: {
          navy: "#0a2540",
          "navy-deep": "#0c2340",
          cyan: "#00d2d3",
          turquoise: "#06b6d4",
          blue: "#0284c7",
          mint: "#10b981",
          mintdeep: "#059669",
          mintwash: "#ecfdf5",
          iceblue: "#e0f2fe",
          frost: "#f8fafc",
          amber: "#f59e0b",
          amberwash: "#fef3c7",
          coral: "#ef4444",
          coralwash: "#fee2e2",
          slate: "#e2e8f0",
          ink: "#0f172a",
        },
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },

      /* typography scale from the token sheet */
      fontSize: {
        "display-hero": ["56px", { lineHeight: "64px", letterSpacing: "-0.03em" }],
        "display-hero-mobile": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em" }],
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
        "headline-xl-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.015em" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.005em" }],
        "body-lg": ["18px", { lineHeight: "28px" }],
        "body-md": ["16px", { lineHeight: "24px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.02em" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.03em" }],
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.08em" }],
      },

      /* pill-centric shape system */
      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "1rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "3rem",
        "4xl": "3.5rem",
        full: "9999px",
      },

      spacing: {
        gutter: "1.5rem",
        "gutter-mobile": "1rem",
        margin: "2.5rem",
        "margin-mobile": "1rem",
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2.5rem",
        "2xl": "3.5rem",
        "3xl": "5rem",
      },

      maxWidth: { shell: "1360px" },

      gridTemplateColumns: {
        16: "repeat(16, minmax(0, 1fr))",
      },

      /* chromatic elevation: tinted ambient light, never opaque grey */
      boxShadow: {
        level1: "0 4px 20px -2px rgba(10,37,64,0.04), 0 2px 6px -1px rgba(0,210,211,0.06)",
        level2: "0 12px 30px -4px rgba(10,37,64,0.08), 0 4px 14px -2px rgba(0,210,211,0.18)",
        level3: "0 24px 48px -12px rgba(10,37,64,0.16), 0 8px 24px -4px rgba(6,182,212,0.22)",
        glow: "0 8px 20px -2px rgba(0,210,211,0.45)",
        "glow-lg": "0 14px 34px -4px rgba(0,210,211,0.55)",
        inset: "inset 0 0 0 1px rgba(0,210,211,0.25)",
        navy: "0 14px 32px -10px rgba(0,15,34,0.45)",
      },

      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.85" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%,-3%,0) scale(1.06)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        riseIn: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        "pulse-ring": "pulseRing 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        drift: "drift 22s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite",
        "rise-in": "riseIn 0.7s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
