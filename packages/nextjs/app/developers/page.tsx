"use client";

import { useState } from "react";
import { Code, Terminal, Key, Webhook, Copy, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "~~/lib/animations";
import toast from "react-hot-toast";

const TABS = ["Overview", "API Reference", "SDK", "API Keys"] as const;
type Tab = typeof TABS[number];

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Code className="w-7 h-7 text-blue-400" />
          Developer Portal
        </h1>
        <p className="text-gray-400 mb-8">Integrate credit scoring into your DeFi protocol</p>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-[#1A1F3D] rounded-lg w-fit mb-8 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "API Reference" && <ApiReferenceTab />}
        {activeTab === "SDK" && <SdkTab />}
        {activeTab === "API Keys" && <ApiKeysTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={staggerItem} className="p-6 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
        <h2 className="text-lg font-semibold text-white mb-3">Quick Start</h2>
        <p className="text-gray-400 mb-4">Get started with credit scoring in under 5 minutes.</p>
        <div className="space-y-4">
          <Step number={1} title="Install the SDK" code="npm install @credbureau/sdk" />
          <Step number={2} title="Initialize the client" code={`const cb = new CredBureau({ apiKey: 'your_api_key' });`} />
          <Step number={3} title="Fetch a credit score" code={`const score = await cb.score.get({ address: '0x...' });`} />
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="grid md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Terminal className="w-6 h-6 text-blue-400" />}
          title="REST API"
          description="8 endpoints for scores, attestations, reports, and webhooks"
        />
        <FeatureCard
          icon={<Code className="w-6 h-6 text-cyan-400" />}
          title="TypeScript SDK"
          description="Zero-dependency SDK with full type safety"
        />
        <FeatureCard
          icon={<Webhook className="w-6 h-6 text-emerald-400" />}
          title="Webhooks"
          description="Real-time notifications for score changes and events"
        />
      </motion.div>
    </motion.div>
  );
}

function ApiReferenceTab() {
  const endpoints = [
    { method: "GET", path: "/api/v1/score", description: "Get credit score for an address", params: "address, chains" },
    { method: "POST", path: "/api/v1/score/detailed", description: "Get detailed score with full breakdown", params: "address, chains, includeOffChain" },
    { method: "GET", path: "/api/v1/verify", description: "Verify an EAS attestation", params: "attestationUID, chain" },
    { method: "GET", path: "/api/v1/history", description: "Get score history", params: "address" },
    { method: "POST", path: "/api/v1/attest", description: "Create EAS attestation", params: "address, chain" },
    { method: "GET", path: "/api/v1/report", description: "Get full credit report", params: "address" },
    { method: "POST", path: "/api/v1/webhook/register", description: "Register a webhook", params: "url, events" },
    { method: "GET", path: "/api/v1/health", description: "Service health check", params: "none" },
  ];

  return (
    <div className="space-y-4">
      {endpoints.map(ep => (
        <div key={ep.path} className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              ep.method === "GET" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
            }`}>
              {ep.method}
            </span>
            <code className="text-white text-sm font-mono">{ep.path}</code>
          </div>
          <p className="text-gray-400 text-sm">{ep.description}</p>
          <p className="text-gray-500 text-xs mt-1">Parameters: {ep.params}</p>
        </div>
      ))}
    </div>
  );
}

function SdkTab() {
  const installCode = `npm install @credbureau/sdk`;
  const usageCode = `import { CredBureau } from '@credbureau/sdk';

const cb = new CredBureau({
  apiKey: 'cb_live_your_api_key',
});

// Get credit score
const score = await cb.score.get({
  address: '0x1234...',
  chains: ['base', 'arbitrum'],
});

// Create attestation
const attestation = await cb.attestation.create({
  address: '0x1234...',
  chain: 'base',
});

// Verify attestation
const verification = await cb.attestation.verify({
  attestationUID: attestation.attestationUid,
  chain: 'base',
});`;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
        <h2 className="text-lg font-semibold text-white mb-3">Installation</h2>
        <CodeBlock code={installCode} />
      </div>
      <div className="p-6 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
        <h2 className="text-lg font-semibold text-white mb-3">Usage</h2>
        <CodeBlock code={usageCode} />
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateKey = async () => {
    setIsGenerating(true);
    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    const key = "cb_live_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    setGeneratedKey(key);
    setIsGenerating(false);
    toast.success("API key created successfully!");
  };

  const handleCopyKey = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("API key copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
      <h2 className="text-lg font-semibold text-white mb-3">API Keys</h2>
      <p className="text-gray-400 mb-6">
        Connect your wallet and create an API key to start making requests.
      </p>

      {generatedKey ? (
        <div className="p-5 rounded-xl bg-[#0A0E27] border border-emerald-500/30 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">API Key Generated</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <code className="flex-1 text-sm font-mono text-white bg-[#1A1F3D] px-4 py-3 rounded-lg break-all">
              {generatedKey}
            </code>
            <button
              onClick={handleCopyKey}
              className="p-2.5 bg-[#1A1F3D] hover:bg-[#2A2F4D] rounded-lg text-gray-400 hover:text-white transition-colors shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              Save this key now. It won&apos;t be shown again.
            </p>
          </div>
          <button
            onClick={() => {
              setGeneratedKey(null);
              setCopied(false);
            }}
            className="px-4 py-2 bg-[#1A1F3D] border border-[#2A2F4D] hover:border-[#3A3F5D] text-gray-300 hover:text-white rounded-lg transition-all text-sm"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          onClick={handleCreateKey}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
        >
          <Key className="w-4 h-4" />
          {isGenerating ? "Generating..." : "Create API Key"}
        </button>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <p>Free tier: 100 requests/minute</p>
        <p>Pro tier: 1,000 requests/minute</p>
      </div>
    </div>
  );
}

// Sub-components

function Step({ number, title, code }: { number: number; title: string; code: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
        <span className="text-blue-400 text-sm font-bold">{number}</span>
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium mb-1">{title}</p>
        <code className="text-xs text-gray-400 font-mono bg-[#0A0E27] px-3 py-1.5 rounded block overflow-x-auto">{code}</code>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
      <div className="mb-3">{icon}</div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <pre className="p-4 bg-[#0A0E27] rounded-lg text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed">
        {code}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-3 right-3 p-2 bg-[#1A1F3D] rounded-md text-gray-400 hover:text-white transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
