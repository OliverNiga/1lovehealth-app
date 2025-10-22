/** @type {import('tailwindcss').Config} */
module.exports = {
  // All files that use `className`
  content: ['./App.{ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  // ⬇️ THIS LINE IS REQUIRED
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // optional: your tokens
      colors: {
        bg: '#0C0F12',
        surface: '#12161B',
        textPrimary: '#F5F7FA',
        textSecondary: '#A6B0BB',
        divider: '#FFFFFF14',
        amber: '#FFB020',
      },
      borderRadius: { card: '24px', chip: '16px' },
    },
  },
  plugins: [],
};
