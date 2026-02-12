/** @type {import('tailwindcss').Config} */
export default {
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
      }
    }
  },
  plugins: []
};
