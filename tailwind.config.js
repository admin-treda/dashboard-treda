/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // AWS/Azure dark palette
        'bg-base': '#0f1419',
        'bg-sidebar': '#1b2433',
        'bg-card': '#151b23',
        'bg-elevated': '#1c2533',
        'bg-hover': '#1e232e',
        accent: {
          blue: '#0078d4',
          aws: '#ff8c00',
        },
        // Legacy bg scale (updated)
        bg: {
          0: '#0f1419',
          1: '#1b2433',
          2: '#151b23',
          3: '#1c2533',
          4: '#1e232e',
          5: '#252b38',
        },
        border: {
          DEFAULT: '#2d3748',
          light: '#2a3040',
        },
        text: {
          0: '#f0f4f8',
          1: '#a0aec0',
          2: '#5a6577',
          3: '#5a6577',
        },
        severity: {
          critico: '#dc2626',
          alto: '#f97316',
          medio: '#eab308',
          bajo: '#22c55e',
          info: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
