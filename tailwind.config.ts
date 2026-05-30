import type { Config } from 'tailwindcss';
import { colors, motion, radius, shadows } from './lib/design/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        full: '9999px',
      },
      boxShadow: shadows,
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        std: motion.duration,
      },
      transitionTimingFunction: {
        std: motion.easing,
      },
    },
  },
  plugins: [],
};

export default config;
