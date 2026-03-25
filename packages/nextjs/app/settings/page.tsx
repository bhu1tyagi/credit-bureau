"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { Settings, Wallet, Bell, Shield, Key, Download, User } from "lucide-react";
import { truncateAddress } from "~~/lib/utils";

const TABS = ["Profile", "Wallets", "Notifications", "Privacy", "API Keys", "Export"] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Profile: <User className="w-4 h-4" />,
  Wallets: <Wallet className="w-4 h-4" />,
  Notifications: <Bell className="w-4 h-4" />,
  Privacy: <Shield className="w-4 h-4" />,
  "API Keys": <Key className="w-4 h-4" />,
  Export: <Download className="w-4 h-4" />,
};

function SettingsPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("Profile");

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-16 h-16 text-gray-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
          <p className="text-gray-400">Connect your wallet to manage settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-400" />
          Settings
        </h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-48 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {TAB_ICONS[tab]}
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === "Profile" && (
              <SettingsCard title="Profile">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Wallet Address</label>
                    <div className="px-4 py-2 bg-[#0A0E27] border border-[#2A2F4D] rounded-lg text-white font-mono text-sm">
                      {address}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Email (optional)</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 bg-[#0A0E27] border border-[#2A2F4D] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm">
                    Save Changes
                  </button>
                </div>
              </SettingsCard>
            )}

            {activeTab === "Wallets" && (
              <SettingsCard title="Linked Wallets">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#0A0E27] border border-[#2A2F4D] flex items-center justify-between">
                    <div>
                      <span className="text-white font-mono text-sm">{truncateAddress(address || "", 8)}</span>
                      <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Primary</span>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 border border-dashed border-[#2A2F4D] rounded-lg text-gray-400 hover:text-white hover:border-gray-400 transition-all text-sm">
                    + Link Another Wallet
                  </button>
                </div>
              </SettingsCard>
            )}

            {activeTab === "Notifications" && (
              <SettingsCard title="Notifications">
                <div className="space-y-4">
                  {["Score changes", "Attestation expiry reminders", "Liquidation alerts", "Weekly report"].map(item => (
                    <div key={item} className="flex items-center justify-between">
                      <span className="text-sm text-white">{item}</span>
                      <ToggleSwitch />
                    </div>
                  ))}
                </div>
              </SettingsCard>
            )}

            {activeTab === "Privacy" && (
              <SettingsCard title="Privacy">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Public Score</p>
                      <p className="text-xs text-gray-500">Allow others to view your score on the Explorer</p>
                    </div>
                    <ToggleSwitch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Leaderboard</p>
                      <p className="text-xs text-gray-500">Opt in to the public leaderboard</p>
                    </div>
                    <ToggleSwitch />
                  </div>
                  <div className="pt-4 border-t border-[#2A2F4D]">
                    <button className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-all">
                      Delete My Data
                    </button>
                  </div>
                </div>
              </SettingsCard>
            )}

            {activeTab === "API Keys" && (
              <SettingsCard title="API Keys">
                <p className="text-gray-400 text-sm mb-4">
                  API keys allow you to access CredBureau data programmatically.
                </p>
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Generate New Key
                </button>
              </SettingsCard>
            )}

            {activeTab === "Export" && (
              <SettingsCard title="Data Export">
                <p className="text-gray-400 text-sm mb-4">
                  Download all your credit data as a JSON file.
                </p>
                <button className="px-4 py-2 bg-[#1A1F3D] border border-[#2A2F4D] text-white rounded-lg hover:border-gray-400 transition-all text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              </SettingsCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ToggleSwitch() {
  const [enabled, setEnabled] = useState(false);

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? "bg-blue-500" : "bg-[#2A2F4D]"
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export default dynamic(() => Promise.resolve(SettingsPage), { ssr: false });
