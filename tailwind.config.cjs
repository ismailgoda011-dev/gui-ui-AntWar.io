/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './script.js',
    './js/**/*.js'
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      primary: 'var(--c-primary)',
      crimson: 'var(--c-crimson)',
      burgundy: 'var(--c-burgundy)',
      gold: 'var(--c-gold)',
      green: 'var(--c-green)',
      cyan: 'var(--c-cyan)',
      danger: 'var(--c-danger)',
      dark: 'var(--c-bg-base)',
      darkest: 'var(--c-bg-darkest)',
      white: 'var(--c-white)',
      black: 'var(--c-black)',
    },
    extend: {
      fontFamily: {
        game: ['var(--font-body)'],
        display: ['var(--font-display)'],
      }
    }
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
