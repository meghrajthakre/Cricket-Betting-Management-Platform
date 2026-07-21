import React from 'react';
import { useNavigate } from 'react-router-dom';

const MENU_ITEMS = [
  { label: 'LIVE MATCH', icon: 'ri-broadcast-line', key: 'live' },
  { label: 'RULES', icon: 'ri-information-line', key: 'rules' },
  { label: 'LEDGER', icon: 'ri-file-list-3-line', key: 'ledger' },
  { label: 'PASSWORD', icon: 'ri-lock-password-line', key: 'password' },
  { label: 'UPCOMING', icon: 'ri-calendar-event-line', key: 'upcoming' },
  { label: 'ENTERTAINMENT', icon: 'ri-gamepad-line', key: 'entertainment' },
  { label: 'SETTINGS', icon: 'ri-settings-3-line', key: 'settings' },
  { label: 'TOURNAMENT', icon: 'ri-trophy-line', key: 'tournament' },
];

const UserDashboard = () => {

  const navigate = useNavigate();

  const go = (key) => {

    if (key !== 'logout') {
      navigate(`/dashboard/${key}`);
    }
  };

  return (
    <div className="min-h-screen bg-(--color-bg-main) font-nunito">




      <main className="py-8 sm:py-10 px-3 sm:px-5 flex justify-center">

        <div className="max-w-[740px] mx-auto">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[24px]">

            {MENU_ITEMS.map(({ label, icon, key }) => (

              <button
                key={key}
                onClick={() => go(key)}
                className="
                  flex items-center gap-4 justify-center
                  px-4 sm:px-6 py-[14px] sm:py-[18px]
                  rounded-[50px]
                  border-2 border-(--color-btn-border)
                  bg-(--color-btn-bg)
                  text-(--color-text-muted)
                  font-rajdhani text-[15px] sm:text-[17px]
                  font-bold tracking-widest uppercase
                  shadow-[0_8px_32px_rgba(0,0,0,0.18)]
                  cursor-pointer
                  transition-all duration-150
                  hover:bg-(--color-btn-hover)
                  hover:-translate-y-0.5
                  hover:shadow-[0_6px_20px_rgba(30,58,95,0.26)]
                  active:translate-y-0
                  opacity-0 animate-fade-up
                "
              >

                <i className={`${icon} text-[22px] sm:text-[26px]`} />

                {label}

              </button>

            ))}

          </div>

        </div>

      </main>

    </div>
  );
};

export default UserDashboard;
