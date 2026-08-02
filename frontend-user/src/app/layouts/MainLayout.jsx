import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import MarqueeBanner from '../../shared/components/MarqueeBanner';
import Footer from "../../shared/components/Footer";
import Navbar from "../../shared/components/Navbar";

const MainLayout = () => {
  const { pathname } = useLocation();
  const isMatchDetailsPage = /^\/match\/[^/]+\/?$/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-(--color-bg-main)">

      <div className="sticky top-0 z-50 shrink-0">
        <Navbar/>
        <MarqueeBanner />

      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      {!isMatchDetailsPage && (
        <footer className="mt-auto">
          <Footer />
        </footer>
      )}

    </div>
  );
};

export default MainLayout;
