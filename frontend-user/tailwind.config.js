/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {

      /* ── Colors — mirrors :root in index.css ──────────────────────────── */
      colors: {
        primary:         '#1E3A5F',   // header bar
        'primary-light': '#2E5080',   // menu buttons, card bg
        banner:          '#4B75B8',   // announcement bar
        'bg-main':       '#E8EDF3',   // page background
        'bg-card':       '#3A5F9A',   // login card
        'input-bg':      '#FFFFFF',   // input fields
        'text-muted':    '#D6E4F5',   // white-ish text on dark bg
        'text-dark':     '#1A2B3C',   // dark text on light bg
        border:          '#CDD9E5',   // input borders
        accent:          '#90B4D4',   // focus rings, captcha border
        error:           '#FCA5A5',   // error messages
        'btn-bg':        '#2B4A7A',   // menu button fill
        'btn-border':    '#3A6298',   // menu button border
        'btn-hover':     '#3558A0',   // menu button hover
      },

      /* ── Typography ───────────────────────────────────────────────────── */
      fontFamily: {
        sans:    ["'Inter'", 'sans-serif'],
        display: ["'Inter'", 'sans-serif'],
        body:    ["'Inter'", 'sans-serif'],
      },

      /* ── Box shadows ──────────────────────────────────────────────────── */
      boxShadow: {
        card:   '0 8px 32px rgba(0, 0, 0, 0.18)',
        header: '0 2px 12px rgba(0, 0, 0, 0.28)',
        btn:    '0 2px 8px rgba(0, 0, 0, 0.14)',
        'btn-hover': '0 6px 20px rgba(30, 58, 95, 0.26)',
      },

      /* ── Keyframe animations ──────────────────────────────────────────── */
      keyframes: {
        /* Scrolling announcement banner */
        marquee: {
          '0%':   { transform: 'translateX(100vw)'  },
          '100%': { transform: 'translateX(-100%)' },
        },
        /* Staggered card / button entrance */
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        /* Login card entrance */
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
      },

      animation: {
        marquee:  'marquee 30s linear infinite',
        fadeUp:   'fadeUp  0.35s ease forwards',
        slideUp:  'slideUp 0.40s ease forwards',
      },

    },
  },

  plugins: [],
};
