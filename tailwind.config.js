/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nsg: {
          gold: "#d0aa61",
          "gold-hover": "#b89149",
          "gold-dark": "#9f7a35",
          "gold-light": "#faf6ed",
          dark: "#18181b",
          "dark-surface": "#27272a",
          bg: "#fcfaf7",
          text: "#504b44",
        },
        zinc: {
          900: "#504b44",
        }
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
