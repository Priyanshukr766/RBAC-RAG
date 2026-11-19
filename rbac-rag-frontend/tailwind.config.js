/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Design guidelines palette - Grok Light Minimalist Monochromatic
        surface: {
          DEFAULT: '#ffffff',
          dim: '#f9f9fb',
          bright: '#ffffff',
          variant: '#f4f4f5',
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#fbfbfb',
          DEFAULT: '#f4f4f5',
          high: '#e4e4e7',
          highest: '#d4d4d8',
        },
        'on-surface': {
          DEFAULT: '#09090b',
          variant: '#71717a',
        },
        'inverse-surface': {
          DEFAULT: '#09090b',
          on: '#f4f4f5',
        },
        outline: {
          DEFAULT: '#71717a',
          variant: '#e4e4e7',
        },
        'surface-tint': '#18181b',
        primary: {
          DEFAULT: '#18181b',
          on: '#ffffff',
          container: '#f4f4f5',
          'on-container': '#18181b',
          inverse: '#ffffff',
          hover: '#09090b',
          fixed: '#f4f4f5',
          'fixed-dim': '#e4e4e7',
          'on-fixed': '#18181b',
          'on-fixed-variant': '#27272a',
        },
        secondary: {
          DEFAULT: '#71717a',
          on: '#ffffff',
          container: '#f4f4f5',
          'on-container': '#18181b',
          fixed: '#f4f4f5',
          'fixed-dim': '#e4e4e7',
          'on-fixed': '#18181b',
          'on-fixed-variant': '#27272a',
        },
        tertiary: {
          DEFAULT: '#52525b',
          on: '#ffffff',
          container: '#f4f4f5',
          'on-container': '#18181b',
          fixed: '#f4f4f5',
          'fixed-dim': '#e4e4e7',
          'on-fixed': '#18181b',
          'on-fixed-variant': '#27272a',
        },
        error: {
          DEFAULT: '#18181b',
          on: '#ffffff',
          container: '#f4f4f5',
          'on-container': '#18181b',
        },
        // Role-specific colors matching PyMuPDF painted bounding boxes
        'role-hr': '#e02626',
        'role-finance': '#9433d9',
        'role-engineering': '#1a73e0',
        'role-public': '#1fa64c',
        'role-admin': '#0f172a',
        'role-intern': '#d97706',
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'level-2': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'level-3': '0 16px 40px rgba(0, 0, 0, 0.08)',
        'primary-focus': '0 0 0 3px rgba(24, 24, 27, 0.12)',
      },
      borderRadius: {
        '3xl': '16px',
        '2xl': '12px',
        xl: '10px',
        lg: '8px',
        md: '6px',
        DEFAULT: '4px',
        sm: '2px',
        card: '10px',
        input: '6px',
        pill: '9999px',
      },
      maxWidth: {
        guideline: '1100px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
