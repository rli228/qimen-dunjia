import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 奇门遁甲主题色
        qimen: {
          gold: 'var(--color-gold)',
          red: 'var(--color-red)',
          blue: 'var(--color-blue)',
          green: 'var(--color-green)',
          purple: 'var(--color-purple)',
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          border: 'var(--color-border)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
