/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#161A22',        // near-black slate (text / sidebar)
        paper: '#F6F6F4',      // warm-neutral app background
        indigo: {
          DEFAULT: '#26336B',  // primary — deep tailored indigo
          600: '#26336B',
          700: '#1E294F',
        },
        brass: '#B98A3C',      // single warm accent (thread / pins)
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)' },
    },
  },
  plugins: [],
};
