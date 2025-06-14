module.exports = {
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  important: true,
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary))',
          50: '#ffffff',
          100: 'rgb(var(--color-primary-100))',
          200: 'rgb(var(--color-primary-200))',
          300: 'rgb(var(--color-primary-300))',
          500: 'rgb(var(--color-primary-500))',
          700: 'rgb(var(--color-primary-700))',
          900: 'rgb(var(--color-primary-900))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary))',
          50: 'rgb(var(--color-secondary-50))',
          100: 'rgb(var(--color-secondary-100))',
          200: 'rgb(var(--color-secondary-200))',
          300: 'rgb(var(--color-secondary-300))',
          500: 'rgb(var(--color-secondary-500))',
          700: 'rgb(var(--color-secondary-700))',
          900: 'rgb(var(--color-secondary-900))',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent))',
          50: 'rgb(var(--color-accent-50))',
          100: 'rgb(var(--color-accent-100))',
          200: 'rgb(var(--color-accent-200))',
          300: 'rgb(var(--color-accent-300))',
          500: 'rgb(var(--color-accent-500))',
          700: 'rgb(var(--color-accent-700))',
          900: 'rgb(var(--color-accent-900))',
        },
        surface: 'rgb(var(--color-surface))',
        text: 'rgb(var(--color-text))',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
      },
    },
  },
  plugins: [],
}
