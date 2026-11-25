import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        stone: 'var(--bg-surface-stone)',
        muted: 'var(--bg-surface-muted)',
        basalt: 'var(--bg-dark-basalt)',
        slateCard: 'var(--bg-dark-slate)',
        tealAccent: 'var(--accent-teal)',
        tealHover: 'var(--accent-teal-hover)',
        tealLight: 'var(--accent-teal-light)',
        mist: 'var(--accent-mist)',
        inkPrimary: 'var(--text-primary)',
        inkSecondary: 'var(--text-secondary)',
        inkDark: 'var(--text-on-dark)',
        inkDarkMuted: 'var(--text-on-dark-muted)',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
