import type {Config} from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        graphite: '#0d1014',
        ember: '#e94b35',
        amber: '#ff9a3d',
        ivory: '#f4eee1',
        slate: '#7d8590',
        steel: '#1a2029',
        mist: '#d9d5ca',
      },
      boxShadow: {
        lab: '0 30px 90px rgba(0,0,0,0.38)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
      },
      animation: {
        drift: 'drift 16s ease-in-out infinite',
        pulsegrid: 'pulsegrid 9s ease-in-out infinite',
      },
      keyframes: {
        drift: {
          '0%, 100%': {transform: 'translate3d(0,0,0) scale(1)'},
          '50%': {transform: 'translate3d(18px,-12px,0) scale(1.03)'},
        },
        pulsegrid: {
          '0%, 100%': {opacity: '0.24'},
          '50%': {opacity: '0.5'},
        },
      },
    },
  },
  plugins: [],
};

export default config;
