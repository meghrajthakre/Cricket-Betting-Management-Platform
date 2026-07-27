import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import MarqueeBanner from '../components/MarqueeBanner';
import Footer from "../pages/Footer";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  const { pathname } = useLocation();
  const isMatchDetailsPage = /^\/match\/[^/]+\/?$/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-(--color-bg-main)">

      <header className="fixed top-0 left-0 right-0 z-50">
        <Navbar/>
      <MarqueeBanner />

      </header>

      {/* Keep content flush with the fixed header: navbar is 56/64px + 32px banner. */}
      <main className="flex-1 pt-22 sm:pt-24">
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
