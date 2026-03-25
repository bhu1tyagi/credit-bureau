"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
};

export const menuLinks: HeaderMenuLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Report", href: "/report" },
  { label: "Explorer", href: "/explorer" },
  { label: "Developers", href: "/developers" },
  { label: "Settings", href: "/settings" },
];

export const HeaderMenuLinks = ({ onClick }: { onClick?: () => void }) => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              onClick={onClick}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * CredBureau Header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, () => setMobileOpen(false));

  return (
    <div className="sticky top-0 z-50 bg-[#0A0E27]/80 backdrop-blur-xl border-b border-[#2A2F4D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="text-white font-bold text-lg hidden sm:block">CredBureau</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:block">
            <ul className="flex items-center gap-1">
              <HeaderMenuLinks />
            </ul>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <SwitchTheme />
            <RainbowKitCustomConnectButton />
            {isLocalNetwork && <FaucetButton />}

            {/* Mobile hamburger */}
            <button className="lg:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div ref={menuRef} className="lg:hidden pb-4">
            <ul className="flex flex-col gap-1">
              <HeaderMenuLinks onClick={() => setMobileOpen(false)} />
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
