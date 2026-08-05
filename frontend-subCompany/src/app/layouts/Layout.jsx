import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-(--color-bg-main)">
      <Navbar onMenu={() => setOpen((value) => !value)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
