/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#ea580c',
          600: '#c2410c',
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '96px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        hue: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        hue: 'hue 16s linear infinite',
      },
    },
  },
  plugins: [],
};

