/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f2',
          100: '#dcebe1',
          200: '#b9d7c4',
          300: '#8cbba0',
          400: '#5c9a7b',
          500: '#3a7d5f',
          600: '#2a634b',
          700: '#224f3d',
          800: '#1c4033',
          900: '#123024',
          950: '#0a1f17',
        },
        emerald2: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        ink: {
          50: '#f6f7f6',
          100: '#ececec',
          200: '#d5dad6',
          300: '#b0bab3',
          400: '#85948b',
          500: '#66776d',
          600: '#516058',
          700: '#424d47',
          800: '#38413c',
          900: '#1d2420',
          950: '#121815',
        },
        canvas: '#f7f8f6',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,24,21,0.04), 0 4px 16px -4px rgba(18,24,21,0.08)',
        lift: '0 2px 4px rgba(18,24,21,0.05), 0 12px 32px -8px rgba(18,24,21,0.16)',
        glow: '0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px -8px rgba(16,185,129,0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'scan-line': {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.2,0.6,0.4,1) infinite',
        shimmer: 'shimmer 1.6s infinite',
        'scan-line': 'scan-line 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
