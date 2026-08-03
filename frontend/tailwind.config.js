/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        deep: 'rgb(var(--color-deep) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        panel2: 'rgb(var(--color-panel2) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        cyan: 'rgb(var(--color-cyan) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        green: 'rgb(var(--color-green) / <alpha-value>)',
        red: 'rgb(var(--color-red) / <alpha-value>)',
        // Fixed (non-themed) near-black — used for text sitting on top of
        // bright accent-colored buttons/badges, which stay dark-on-bright
        // in both light and dark mode rather than flipping with the theme.
        ink0: '#0A0E14',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(79, 216, 224, 0.35)',
        amberGlow: '0 0 24px -4px rgba(255, 176, 32, 0.45)',
        // Claymorphism: soft dual shadow (a "light source" highlight and a
        // soft dark falloff) instead of a hard border — reads as a puffy,
        // slightly-raised surface. Colors come from theme-aware CSS
        // variables so they adapt automatically between light/dark mode.
        clay: '9px 9px 18px rgb(var(--clay-lo) / 0.5), -9px -9px 18px rgb(var(--clay-hi) / 0.6)',
        'clay-sm': '5px 5px 11px rgb(var(--clay-lo) / 0.45), -5px -5px 11px rgb(var(--clay-hi) / 0.55)',
        'clay-xs': '3px 3px 6px rgb(var(--clay-lo) / 0.4), -3px -3px 6px rgb(var(--clay-hi) / 0.5)',
        'clay-inset': 'inset 4px 4px 9px rgb(var(--clay-lo) / 0.45), inset -4px -4px 9px rgb(var(--clay-hi) / 0.55)',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.6)', opacity: 0.9 },
          '100%': { transform: 'scale(2.4)', opacity: 0 },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
        slideIn: {
          '0%': { transform: 'translateX(12px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
      },
      animation: {
        sweep: 'sweep 6s linear infinite',
        pulseRing: 'pulseRing 2s ease-out infinite',
        blink: 'blink 1.6s ease-in-out infinite',
        slideIn: 'slideIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
