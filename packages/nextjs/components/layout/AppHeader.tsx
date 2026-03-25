"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X } from "lucide-react";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { cn } from "~~/lib/utils";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Report", href: "/report" },
  { label: "Explorer", href: "/explorer" },
  { label: "Developers", href: "/developers" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <header className="sticky top-0 z-50 border-b border-[#2A2F4D] bg-[#0A0E27]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Logo mark */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              CB
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Cred
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">Bureau</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-[#1A1F3D] text-white" : "text-gray-400 hover:text-white hover:bg-[#111631]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <SwitchTheme className="hidden sm:flex" />
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
          />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden rounded-lg p-2 text-gray-400 hover:bg-[#111631] hover:text-white transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div ref={menuRef} className="border-t border-[#2A2F4D] bg-[#0A0E27] px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-[#1A1F3D] text-white" : "text-gray-400 hover:text-white hover:bg-[#111631]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 pt-3 border-t border-[#2A2F4D]">
            <SwitchTheme />
          </div>
        </div>
      )}
    </header>
  );
}
