/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--brand) / <alpha-value>)',
        brand2: 'rgb(var(--brand2) / <alpha-value>)',
        onbrand: 'rgb(var(--onbrand) / <alpha-value>)',
        onbrand2: 'rgb(var(--onbrand2) / <alpha-value>)',
      },
      borderRadius: {
        app: 'var(--radius)',
        'app-lg': 'calc(var(--radius) * 1.6)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
    },
  },
  plugins: [],
};
