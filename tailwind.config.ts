import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        accent: '#1B3A5C',
        'accent-hover': '#152E4A',
        'accent-light': '#E8EEF4',
        'text-primary': '#3D3535',
        'text-secondary': '#888888',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        button: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
