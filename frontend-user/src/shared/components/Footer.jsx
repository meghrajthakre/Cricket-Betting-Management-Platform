import React from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Home',       icon: 'ri-home-4-line'         },
  { href: '/rules',     label: 'Rules',       icon: 'ri-information-line'    },
  { href: '/ledger',    label: 'Ledger',      icon: 'ri-file-list-3-line'    },
  { href: '/password',  label: 'Password',    icon: 'ri-lock-password-line'  },
];

const MATCH_LINKS = [
  { href: '/live',          label: 'Live Matches',  icon: 'ri-broadcast-line'      },
  { href: '/upcoming',      label: 'Upcoming',      icon: 'ri-calendar-event-line' },
  { href: '/tournament',    label: 'Tournament',    icon: 'ri-trophy-line'         },
  { href: '/entertainment', label: 'Entertainment', icon: 'ri-gamepad-line'        },
];

const SOCIAL_LINKS = [
  { href: '#', icon: 'ri-whatsapp-line',  label: 'WhatsApp'  },
  { href: '#', icon: 'ri-telegram-line',  label: 'Telegram'  },
  { href: '#', icon: 'ri-instagram-line', label: 'Instagram' },
  { href: '#', icon: 'ri-youtube-line',   label: 'YouTube'   },
];

/* Reusable link list */
const LinkList = ({ title, links }) => (
  <div className="flex flex-col items-center text-center">
    <h3 className="
      font-rajdhani font-semibold text-base uppercase tracking-widest
      text-(--color-text-muted) mb-4
      pb-2 border-b border-(--color-text-muted)/20 w-full text-center
    ">
      {title}
    </h3>
    <ul className="space-y-2.5 w-full">
      {links.map(({ href, label, icon }) => (
        <li key={href}>
          <a
            href={href}
            className="
              flex items-center justify-center gap-2
              text-sm font-nunito text-(--color-text-muted)/80
              transition-all duration-150
              hover:text-(--color-text-muted) hover:translate-x-0.5
            "
          >
            <i className={`${icon} text-base`} aria-hidden="true" />
            {label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  return (
    <footer className="bg-(--color-primary) text-(--color-text-muted) font-nunito mt-auto">

      {/* ── Top accent bar ─────────────────────────────────────── */}
      <div className="h-1 bg-(--color-banner) w-full" />

      {/* ── Main footer body ───────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Brand + tagline — centered */}
        <div className="text-center mb-10">
          <h2 className="
            font-rajdhani text-2xl font-bold tracking-[.12em] uppercase
            text-(--color-text-muted)
          ">
            Sonu Book Group
          </h2>
          <p className="text-sm text-(--color-text-muted)/60 mt-1 font-nunito tracking-wide">
            Trusted · Transparent · Fair Play
          </p>
        </div>

        {/* Link columns — centered, responsive */}
        <div className="
          grid grid-cols-2 md:grid-cols-2
          gap-8 md:gap-16
          justify-items-center
          mb-10
        ">
          <LinkList title="Navigation" links={NAV_LINKS}  />
          <LinkList title="Matches"    links={MATCH_LINKS} />
        </div>

        {/* Social icons — centered row */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {SOCIAL_LINKS.map(({ href, icon, label }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="
                flex items-center justify-center
                w-9 h-9 rounded-full
                border border-(--color-text-muted)/25
                text-(--color-text-muted)/70
                transition-all duration-150
                hover:border-(--color-text-muted)/60
                hover:text-(--color-text-muted)
                hover:bg-(--color-text-muted)/10
                hover:scale-110
              "
            >
              <i className={`${icon} text-base`} aria-hidden="true" />
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-(--color-text-muted)/20 mb-6" />

        {/* Copyright — centered */}
        <p className="text-center text-xs text-(--color-text-muted)/50 font-nunito tracking-wide">
          © Copyright 2026 Sonu Book Group. All rights reserved.
        </p>

      </div>

    </footer>
  );
};

export default Footer;