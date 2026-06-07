import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/emoji-picker-react/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      animation: {
        border: "border 4s linear infinite",
        'fade-in': 'fadeIn 0.1s ease-in-out',
        'zoom-in': 'zoomIn 0.1s ease-in-out',
      },
      keyframes: {
        border: {
          to: { "--border-angle": "360deg" },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      colors: {
        primary: "var(--theme-primary)",
      },
    },
  },
  plugins: [daisyui],
};