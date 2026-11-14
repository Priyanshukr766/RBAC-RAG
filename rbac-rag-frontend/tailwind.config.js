/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Design guidelines palette (Context.dev / Technical Minimalism)
        surface: {
          DEFAULT: '#ffffff',
          dim: '#f5f5f5',
          bright: '#ffffff',
          variant: '#e1e4e8',
        },
        'surface-container': {
          lowest: '#fafafa',
          low: '#f0f0f0',
          DEFAULT: '#eeeeee',
          high: '#e1e4e8',
          highest: '#d0d7de',
        },
        'on-surface': {
          DEFAULT: '#030712',
          variant: '#57606a',
        },
        'inverse-surface': {
          DEFAULT: '#0d1117',
          on: '#f0f6fc',
        },
        outline: {
          DEFAULT: '#444444',
          variant: '#aaaaaa',
        },
        'surface-tint': '#268bff',
        primary: {
          DEFAULT: '#268bff',
          on: '#ffffff',
          container: '#cee0f9',
          'on-container': '#001d3d',
          inverse: '#79b8ff',
          hover: '#1a73e8',
          fixed: '#cee0f9',
          'fixed-dim': '#79b8ff',
          'on-fixed': '#001d3d',
          'on-fixed-variant': '#004b94',
        },
        secondary: {
          DEFAULT: '#4a6fd4',
          on: '#ffffff',
          container: '#edf3fd',
          'on-container': '#0d1f4d',
          fixed: '#edf3fd',
          'fixed-dim': '#4a6fd4',
          'on-fixed': '#0d1f4d',
          'on-fixed-variant': '#2d4a7b',
        },
        tertiary: {
          DEFAULT: '#6b21a8',
          on: '#ffffff',
          container: '#b392f0',
          'on-container': '#2d0052',
          fixed: '#b392f0',
          'fixed-dim': '#6b21a8',
          'on-fixed': '#2d0052',
          'on-fixed-variant': '#8b5cf6',
        },
        error: {
          DEFAULT: '#f97583',
          on: '#ffffff',
          container: '#ffb4ab',
          'on-container': '#3d0001',
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
        'level-2': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'level-3': '0 16px 40px rgba(0, 0, 0, 0.12)',
        'primary-focus': '0 0 0 3px rgba(38, 139, 255, 0.35)',
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
