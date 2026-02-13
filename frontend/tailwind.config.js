/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          500: '#3b82f6',
          600: '#2563eb'
        }
      },
      boxShadow: {
        card: '0 20px 60px rgba(15, 23, 42, 0.25)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { opacity: 0.45 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.45 }
        }
      },
      animation: {
        fadeIn: 'fadeIn 350ms ease-out',
        shimmer: 'shimmer 1.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
