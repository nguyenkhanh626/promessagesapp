/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teams: {
          purple: '#464775',
          lavender: '#6264A7',
          primary: '#5B5FC7',
          dark: '#201f1f',
          'dark-sub': '#292929',
          border: '#383838',
          light: '#f5f5f5',
          white: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}
