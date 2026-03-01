/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        aurora: {
          dusk: '#0f172a',
          glow: '#6366f1',
          mint: '#5eead4',
          coral: '#fb7185',
          amber: '#fbbf24',
        },
      },
      backgroundImage: {
        nebula: 'radial-gradient(circle at top, rgba(99,102,241,0.35), rgba(15,23,42,0.95))',
      },
      boxShadow: {
        glass: '0 20px 60px rgba(15,23,42,0.35)',
      },
    },
  },
  plugins: [],
};
