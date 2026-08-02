import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    /*
      h-[100dvh] fixes mobile viewport height issue (Chrome + Safari)
      flex flex-col = full vertical layout
      overflow-hidden = prevent outer scroll
    */
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-main)" }}
    >
      {/* ── Navbar ── */}
      <Navbar onMenuClick={toggleSidebar} />

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* ── Main Content ── */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ backgroundColor: "var(--color-bg-main)" }}
        >
          {/* Content wrapper with safe padding */}
          <div className="p-3 sm:p-6 lg:p-8 pb-safe">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}