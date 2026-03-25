"use client";

import dynamic from "next/dynamic";

const DebugContracts = dynamic(() => import("./DebugContracts").then(mod => ({ default: mod.DebugContracts })), {
  ssr: false,
});

export function DebugContractsClient() {
  return <DebugContracts />;
}
