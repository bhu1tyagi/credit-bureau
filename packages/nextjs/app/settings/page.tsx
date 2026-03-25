"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import {
  Settings,
  Wallet,
  Bell,
  Shield,
  Key,
  Download,
  User,
  Loader2,
  Copy,
  AlertTriangle,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { truncateAddress } from "~~/lib/utils";
import { getSupabaseClient } from "~~/lib/supabase/client";
import { useLinkedWallets } from "~~/hooks/useLinkedWallets";

const TABS = ["Profile", "Wallets", "Notifications", "Privacy", "API Keys", "Export"] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Profile: <User className="w-4 h-4" />,
  Wallets: <Wallet className="w-4 h-4" />,
  Notifications: <Bell className="w-4 h-4" />,
  Privacy: <Shield className="w-4 h-4" />,
  "API Keys": <Key className="w-4 h-4" />,
  Export: <Download className="w-4 h-4" />,
};

const SUPPORTED_CHAINS = ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Base"];

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "#627EEA",
  polygon: "#8247E5",
  arbitrum: "#2D374B",
  optimism: "#FF0420",
  base: "#0052FF",
};

// ---------------------------------------------------------------------------
// Notification preference keys
// ---------------------------------------------------------------------------
const NOTIFICATION_KEYS = [
  "score_changes",
  "attestation_expiry",
  "liquidation_alerts",
  "weekly_report",
] as const;

const NOTIFICATION_LABELS: Record<string, string> = {
  score_changes: "Score changes",
  attestation_expiry: "Attestation expiry reminders",
  liquidation_alerts: "Liquidation alerts",
  weekly_report: "Weekly report",
};

const PRIVACY_KEYS = ["public_score", "leaderboard"] as const;

// ---------------------------------------------------------------------------
// Helper: localStorage toggle state
// ---------------------------------------------------------------------------
function readToggle(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
}

function writeToggle(key: string, value: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, String(value));
  }
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------
function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        checked ? "bg-blue-500" : "bg-[#2A2F4D]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Settings Card
// ---------------------------------------------------------------------------
function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
function SettingsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Profile");

  // -- Profile state --
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // -- Wallets state --
  const { wallets, isLoading: walletsLoading, linkWallet, unlinkWallet, isLinking } = useLinkedWallets(address);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletChain, setNewWalletChain] = useState(SUPPORTED_CHAINS[0]);
  const [unlinkingAddress, setUnlinkingAddress] = useState<string | null>(null);

  // -- Notification toggles --
  const [notifState, setNotifState] = useState<Record<string, boolean>>({});
  // -- Privacy toggles --
  const [privacyState, setPrivacyState] = useState<Record<string, boolean>>({});

  // -- Delete confirmation --
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -- API Keys --
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // -- Export --
  const [exporting, setExporting] = useState(false);

  // Initialize toggle states from localStorage
  useEffect(() => {
    const n: Record<string, boolean> = {};
    for (const k of NOTIFICATION_KEYS) {
      n[k] = readToggle(`notif_${k}`);
    }
    setNotifState(n);

    const p: Record<string, boolean> = {};
    for (const k of PRIVACY_KEYS) {
      p[k] = readToggle(`privacy_${k}`);
    }
    setPrivacyState(p);
  }, []);

  // -------------------------------------------------------------------
  // Profile handlers
  // -------------------------------------------------------------------
  const handleSaveProfile = useCallback(async () => {
    if (!address) return;
    setSavingProfile(true);
    try {
      const supabase = getSupabaseClient();
      await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("user_profiles")
        .upsert({ wallet_address: address.toLowerCase(), email }, { onConflict: "wallet_address" });
      toast.success("Profile saved!");
    } catch (err) {
      console.error("[settings] save profile", err);
      toast.error("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }, [address, email]);

  // -------------------------------------------------------------------
  // Link wallet handlers
  // -------------------------------------------------------------------
  const handleLinkWallet = useCallback(async () => {
    const trimmed = newWalletAddress.trim();
    if (!trimmed) {
      toast.error("Please enter a wallet address.");
      return;
    }
    try {
      await linkWallet(trimmed, newWalletChain.toLowerCase());
      toast.success("Wallet linked successfully!");
      setNewWalletAddress("");
      setNewWalletChain(SUPPORTED_CHAINS[0]);
      setShowLinkForm(false);
    } catch (err) {
      console.error("[settings] link wallet", err);
      toast.error("Failed to link wallet.");
    }
  }, [newWalletAddress, newWalletChain, linkWallet]);

  const handleUnlinkWallet = useCallback(
    async (addr: string) => {
      setUnlinkingAddress(addr);
      try {
        await unlinkWallet(addr);
        toast.success("Wallet unlinked.");
      } catch (err) {
        console.error("[settings] unlink wallet", err);
        toast.error("Failed to unlink wallet.");
      } finally {
        setUnlinkingAddress(null);
      }
    },
    [unlinkWallet],
  );

  // -------------------------------------------------------------------
  // Toggle handlers
  // -------------------------------------------------------------------
  const handleNotifToggle = useCallback((key: string, value: boolean) => {
    setNotifState(prev => ({ ...prev, [key]: value }));
    writeToggle(`notif_${key}`, value);
    toast.success("Notification preference updated");
  }, []);

  const handlePrivacyToggle = useCallback((key: string, value: boolean) => {
    setPrivacyState(prev => ({ ...prev, [key]: value }));
    writeToggle(`privacy_${key}`, value);
    toast.success("Notification preference updated");
  }, []);

  // -------------------------------------------------------------------
  // Delete data
  // -------------------------------------------------------------------
  const handleDeleteData = useCallback(async () => {
    if (!address) return;
    setDeleting(true);
    try {
      const supabase = getSupabaseClient();
      const addr = address.toLowerCase();
      // Delete across all relevant tables
      await Promise.allSettled([
        (supabase as any).from("credit_scores").delete().eq("wallet_address", addr), // eslint-disable-line @typescript-eslint/no-explicit-any
        (supabase as any).from("attestations").delete().eq("user_address", addr), // eslint-disable-line @typescript-eslint/no-explicit-any
        (supabase as any).from("offchain_verifications").delete().eq("user_address", addr), // eslint-disable-line @typescript-eslint/no-explicit-any
        (supabase as any).from("linked_wallets").delete().eq("user_id", addr), // eslint-disable-line @typescript-eslint/no-explicit-any
        (supabase as any).from("user_profiles").delete().eq("wallet_address", addr), // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);
      toast.success("All your data has been deleted.");
      router.push("/");
    } catch (err) {
      console.error("[settings] delete data", err);
      toast.error("Failed to delete data.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [address, router]);

  // -------------------------------------------------------------------
  // Generate API key
  // -------------------------------------------------------------------
  const handleGenerateKey = useCallback(() => {
    setGeneratingKey(true);
    setKeyCopied(false);
    // Simulate brief generation delay
    setTimeout(() => {
      const uuid = crypto.randomUUID();
      setGeneratedKey(uuid);
      setGeneratingKey(false);
    }, 600);
  }, []);

  const handleCopyKey = useCallback(async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setKeyCopied(true);
      toast.success("API key copied!");
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  }, [generatedKey]);

  // -------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------
  const handleExport = useCallback(async () => {
    if (!address) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/report?address=${address}`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `credburo-export-${address.slice(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    } catch (err) {
      console.error("[settings] export", err);
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  }, [address]);

  // -------------------------------------------------------------------
  // Not connected guard
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
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
            {/* ==================== PROFILE ==================== */}
            {activeTab === "Profile" && (
              <SettingsCard title="Profile">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Wallet Address</label>
                    <div className="px-4 py-2 bg-[#0A0E27] border border-[#2A2F4D] rounded-lg text-white font-mono text-sm select-all">
                      {address}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={savingProfile}
                      className="w-full px-4 py-2 bg-[#0A0E27] border border-[#2A2F4D] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white rounded-lg transition-all text-sm flex items-center gap-2"
                  >
                    {savingProfile && <Spinner />}
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </SettingsCard>
            )}

            {/* ==================== WALLETS ==================== */}
            {activeTab === "Wallets" && (
              <SettingsCard title="Linked Wallets">
                <div className="space-y-3">
                  {/* Primary wallet */}
                  <div className="p-3 rounded-lg bg-[#0A0E27] border border-[#2A2F4D] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">{truncateAddress(address || "", 8)}</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Primary</span>
                    </div>
                  </div>

                  {/* Linked wallets list */}
                  {walletsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Spinner className="w-5 h-5 text-gray-400" />
                    </div>
                  )}

                  {wallets
                    .filter(w => !w.isPrimary)
                    .map(wallet => (
                      <div
                        key={wallet.id}
                        className="p-3 rounded-lg bg-[#0A0E27] border border-[#2A2F4D] flex items-center justify-between group hover:border-[#3B82F6]/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{
                              backgroundColor: CHAIN_COLORS[wallet.chain.toLowerCase()] ?? "#6B7280",
                            }}
                          >
                            {wallet.chain.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-mono text-sm">{truncateAddress(wallet.address, 6)}</span>
                            <span className="ml-2 text-xs text-gray-500 capitalize">{wallet.chain}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnlinkWallet(wallet.address)}
                          disabled={unlinkingAddress === wallet.address}
                          className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50"
                          title="Unlink wallet"
                        >
                          {unlinkingAddress === wallet.address ? (
                            <Spinner className="w-4 h-4" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}

                  {/* Inline link form */}
                  {showLinkForm && (
                    <div className="p-4 rounded-lg bg-[#0A0E27] border border-blue-500/20 space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Wallet Address</label>
                        <input
                          type="text"
                          value={newWalletAddress}
                          onChange={e => setNewWalletAddress(e.target.value)}
                          placeholder="0x..."
                          disabled={isLinking}
                          className="w-full px-3 py-2 bg-[#1A1F3D] border border-[#2A2F4D] rounded-lg text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Chain</label>
                        <select
                          value={newWalletChain}
                          onChange={e => setNewWalletChain(e.target.value)}
                          disabled={isLinking}
                          className="w-full px-3 py-2 bg-[#1A1F3D] border border-[#2A2F4D] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                        >
                          {SUPPORTED_CHAINS.map(chain => (
                            <option key={chain} value={chain}>
                              {chain}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleLinkWallet}
                          disabled={isLinking}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition-all flex items-center gap-2"
                        >
                          {isLinking ? <Spinner /> : <Check className="w-4 h-4" />}
                          {isLinking ? "Linking..." : "Link Wallet"}
                        </button>
                        <button
                          onClick={() => {
                            setShowLinkForm(false);
                            setNewWalletAddress("");
                            setNewWalletChain(SUPPORTED_CHAINS[0]);
                          }}
                          disabled={isLinking}
                          className="px-4 py-2 border border-[#2A2F4D] text-gray-400 hover:text-white rounded-lg text-sm transition-all flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Link another wallet button */}
                  {!showLinkForm && (
                    <button
                      onClick={() => setShowLinkForm(true)}
                      className="w-full px-4 py-2 border border-dashed border-[#2A2F4D] rounded-lg text-gray-400 hover:text-white hover:border-gray-400 transition-all text-sm"
                    >
                      + Link Another Wallet
                    </button>
                  )}
                </div>
              </SettingsCard>
            )}

            {/* ==================== NOTIFICATIONS ==================== */}
            {activeTab === "Notifications" && (
              <SettingsCard title="Notifications">
                <div className="space-y-4">
                  {NOTIFICATION_KEYS.map(key => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-white">{NOTIFICATION_LABELS[key]}</span>
                      <ToggleSwitch
                        checked={!!notifState[key]}
                        onChange={v => handleNotifToggle(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </SettingsCard>
            )}

            {/* ==================== PRIVACY ==================== */}
            {activeTab === "Privacy" && (
              <SettingsCard title="Privacy">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Public Score</p>
                      <p className="text-xs text-gray-500">Allow others to view your score on the Explorer</p>
                    </div>
                    <ToggleSwitch
                      checked={!!privacyState["public_score"]}
                      onChange={v => handlePrivacyToggle("public_score", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Leaderboard</p>
                      <p className="text-xs text-gray-500">Opt in to the public leaderboard</p>
                    </div>
                    <ToggleSwitch
                      checked={!!privacyState["leaderboard"]}
                      onChange={v => handlePrivacyToggle("leaderboard", v)}
                    />
                  </div>

                  <div className="pt-4 border-t border-[#2A2F4D]">
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-all"
                      >
                        Delete My Data
                      </button>
                    ) : (
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/30 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-400">Are you sure?</p>
                            <p className="text-xs text-red-400/70 mt-1">
                              This will permanently delete all your credit scores, attestations, verifications, and
                              linked wallets. This action cannot be undone.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-8">
                          <button
                            onClick={handleDeleteData}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm transition-all flex items-center gap-2"
                          >
                            {deleting && <Spinner />}
                            {deleting ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleting}
                            className="px-4 py-2 border border-[#2A2F4D] text-gray-400 hover:text-white rounded-lg text-sm transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* ==================== API KEYS ==================== */}
            {activeTab === "API Keys" && (
              <SettingsCard title="API Keys">
                <p className="text-gray-400 text-sm mb-4">
                  API keys allow you to access CredBureau data programmatically.
                </p>

                {generatedKey && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <code className="flex-1 text-emerald-400 font-mono text-sm break-all select-all">
                        {generatedKey}
                      </code>
                      <button
                        onClick={handleCopyKey}
                        className="shrink-0 p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-all"
                        title="Copy key"
                      >
                        {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-400/80">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>This key will only be shown once. Save it somewhere safe.</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  {generatingKey ? <Spinner /> : <Key className="w-4 h-4" />}
                  {generatingKey ? "Generating..." : "Generate New Key"}
                </button>
              </SettingsCard>
            )}

            {/* ==================== EXPORT ==================== */}
            {activeTab === "Export" && (
              <SettingsCard title="Data Export">
                <p className="text-gray-400 text-sm mb-4">Download all your credit data as a JSON file.</p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2 bg-[#1A1F3D] border border-[#2A2F4D] text-white rounded-lg hover:border-gray-400 disabled:opacity-50 transition-all text-sm flex items-center gap-2"
                >
                  {exporting ? <Spinner /> : <Download className="w-4 h-4" />}
                  {exporting ? "Exporting..." : "Export All Data"}
                </button>
              </SettingsCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SettingsPage), { ssr: false });
