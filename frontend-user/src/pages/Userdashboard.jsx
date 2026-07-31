import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSportsCricket } from 'react-icons/md';
import {
  RiInformationLine,
  RiFileList3Line,
  RiLockPasswordLine,
  RiCalendarEventLine,
  RiGamepadLine,
  RiSettings3Line,
  RiTrophyLine,
} from 'react-icons/ri';

const MENU_ITEMS = [
  { label: 'LIVE MATCH', icon: MdSportsCricket, key: 'live' },
  { label: 'RULES', icon: RiInformationLine, key: 'rules' },
  { label: 'LEDGER', icon: RiFileList3Line, key: 'ledger' },
  { label: 'PASSWORD', icon: RiLockPasswordLine, key: 'password' },
  { label: 'UPCOMING', icon: RiCalendarEventLine, key: 'upcoming' },
  { label: 'ENTERTAINMENT', icon: RiGamepadLine, key: 'entertainment' },
  { label: 'SETTINGS', icon: RiSettings3Line, key: 'settings' },
  { label: 'TOURNAMENT', icon: RiTrophyLine, key: 'tournament' },
];

const UserDashboard = () => {
  const navigate = useNavigate();

  const go = (key) => {
    if (key !== 'logout') {
      navigate(`/dashboard/${key}`);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-5.5rem)] bg-(--color-bg-main) font-nunito sm:min-h-[calc(100dvh-6rem)]">
      <main className="flex justify-center px-3 pb-8 pt-10 sm:px-5 sm:pb-12 sm:pt-12">
        <div className="mx-auto max-w-[740px]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7">
            {MENU_ITEMS.map(({ label, icon: Icon, key }, i) => (
              <button
                key={key}
                onClick={() => go(key)}
                style={{ animationDelay: `${i * 60}ms` }}
                className="
                  flex items-center justify-center gap-4 sm:gap-5
                  px-4 sm:px-6 py-[14px] sm:py-[18px]
                  rounded-[50px]
                  border-2 border-(--color-btn-border)
                  bg-(--color-btn-bg)
                  text-(--color-text-muted)
                  font-rajdhani text-[15px] sm:text-[17px]
                  font-bold tracking-widest uppercase leading-none
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
                <Icon
                  className="shrink-0 text-[22px] sm:text-[26px]"
                  aria-hidden="true"
                />
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;