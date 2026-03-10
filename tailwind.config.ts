import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#08090e',
          card: '#0d0f18',
          elevated: '#12151f',
          border: '#1c2035',
        },
        accent: {
          green: '#00e5a0',
          red: '#ff3d5a',
          amber: '#f5a623',
          blue: '#4a9eff',
          muted: '#2a3050',
        },
        text: {
          primary: '#e2e5f0',
          secondary: '#8892a4',
          tertiary: '#4a5568',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,229,160,0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(0,229,160,0.15)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
