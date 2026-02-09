/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'], // Changed to Inter for a more official look if available, otherwise fallback
        secondary: ['"Inter"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0f172a', // slate-900 (Black/Dark Slate)
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f1f5f9', // slate-100
          foreground: '#0f172a', // slate-900
        },
        accent: {
          DEFAULT: '#f1f5f9', // slate-100 (Subtle accent)
          foreground: '#0f172a', // slate-900
        },
        background: '#ffffff', // White background for cleanliness
        foreground: '#0f172a', // slate-900
        muted: {
          DEFAULT: '#f8fafc', // slate-50
          foreground: '#64748b', // slate-500
        },
        border: '#e2e8f0', // slate-200
      },
      borderRadius: {
        lg: '0.375rem', // sm/md feel (6px) - making it tighter
        xl: '0.5rem',   // 8px - tighter than default 12px
        '2xl': '0.75rem', // 12px
      }
    },
  },
  plugins: [],
}
