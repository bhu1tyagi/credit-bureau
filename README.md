# CredBureau — The Credit Bureau for DeFi

**Portable, composable credit identity for the on-chain economy.**

CredBureau is a full-stack DeFi credit bureau that scores crypto wallets (300-850 FICO-equivalent range) based on on-chain lending history, portfolio diversity, and repayment behavior. Users can mint privacy-preserving on-chain attestations (via EAS) of their score and use a portable credit identity across DeFi lending protocols. The platform also exposes a REST API + npm SDK so protocols like Aave, Morpho, and Compound can plug in credit checks as middleware.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Credit Scoring Algorithm](#credit-scoring-algorithm)
- [Frontend Pages](#frontend-pages)
- [REST API Reference](#rest-api-reference)
- [React Components](#react-components)
- [Custom Hooks](#custom-hooks)
- [Core Libraries](#core-libraries)
- [Smart Contracts](#smart-contracts)
- [npm SDK](#npm-sdk-credbureausk)
- [ML Service](#ml-service-python-fastapi)
- [Database Schema](#database-schema-supabase)
- [Design System](#design-system)
- [Environment Variables](#environment-variables)
- [Setup & Running](#setup--running)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Architecture Overview

```
                                    +-------------------+
                                    |   Landing Page    |
                                    |   Dashboard       |
                                    |   Report          |
           User connects wallet --> |   Explorer        | <-- Next.js 15 App Router
                                    |   Developers      |
                                    |   Settings        |
                                    +--------+----------+
                                             |
                                             v
                                    +-------------------+
                                    |  REST API Routes  |
                                    |  /api/v1/score    |
                                    |  /api/v1/attest   |
                                    |  /api/v1/verify   |
                                    |  /api/v1/report   |
                                    |  ...8 more        |
                                    +--------+----------+
                                             |
                        +--------------------+--------------------+
                        |                    |                    |
                        v                    v                    v
               +----------------+   +----------------+   +----------------+
               |  Data Layer    |   |  Scoring       |   |  Attestation   |
               |  - GoldRush    |   |  - Deterministic|  |  - EAS SDK     |
               |    SDK         |   |    Algorithm   |   |  - Schema Reg  |
               |  - The Graph   |   |  - ML Service  |   |  - On-chain    |
               |    (Aave V3)   |   |    (XGBoost)   |   |    Attestation |
               |  - Cred Proto  |   |  - Off-chain   |   |  - Verify      |
               |  - Reclaim     |   |    Bonus       |   |  - Revoke      |
               +----------------+   +----------------+   +----------------+
                        |                    |                    |
                        v                    v                    v
               +----------------+   +----------------+   +----------------+
               |  Supabase      |   |  Python FastAPI|   |  Foundry       |
               |  (PostgreSQL)  |   |  ML Service    |   |  Smart         |
               |  8 tables      |   |  :8000         |   |  Contracts     |
               +----------------+   +----------------+   +----------------+
```

### Data Flow: Wallet Connect to Credit Score

1. User connects wallet via RainbowKit
2. Frontend calls `GET /api/v1/score?address=0x...`
3. API route triggers parallel data fetches:
   - **GoldRush SDK**: Token balances, transaction history, first-tx date, NFTs, DeFi positions across 4 chains
   - **The Graph** (Aave V3 Subgraph): Borrow, repay, liquidation events with USD values
   - **Cred Protocol** (optional): Baseline credit score as calibration signal
4. Data aggregator merges results into a `WalletProfile` with real metrics
5. Deterministic scoring algorithm computes a 300-850 score from 7 weighted factors
6. If ML service is running, blends 70% deterministic + 30% ML prediction
7. Score + breakdown persisted to Supabase
8. User can mint an EAS attestation of the score on Base Sepolia (free testnet)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.2.8 |
| **React** | React | 19.2.3 |
| **Web3** | wagmi + viem + RainbowKit | 2.19.5 / 2.39.0 / 2.2.9 |
| **Styling** | Tailwind CSS + DaisyUI | 4.1.3 / 5.0.9 |
| **Animation** | Framer Motion | 12.x |
| **Charts** | Recharts | 3.8.x |
| **Icons** | Lucide React | 0.577.x |
| **On-chain Data** | GoldRush/Covalent SDK | 3.0.6 |
| **Lending Data** | The Graph (Aave V3 Subgraphs) | GraphQL |
| **Attestations** | EAS SDK | 2.9.0 |
| **Off-chain Verification** | Reclaim Protocol SDK | 4.15.2 |
| **Database** | Supabase (PostgreSQL) | @supabase/supabase-js 2.99.3 |
| **Smart Contracts** | Foundry (Solidity ^0.8.20) | 1.5.1 |
| **ML Model** | Python FastAPI + XGBoost | FastAPI 0.115.0 |
| **SDK** | TypeScript (tsup build) | ESM + CJS |
| **Monorepo** | Yarn Workspaces | 3.2.3 |
| **Boilerplate** | Scaffold-ETH 2 | Latest |

---

## Project Structure

```
credit-bureau/
├── packages/
│   ├── nextjs/                          # Frontend + API (Next.js 15)
│   │   ├── app/
│   │   │   ├── page.tsx                 # Landing page
│   │   │   ├── layout.tsx               # Root layout (Inter + JetBrains Mono fonts)
│   │   │   ├── dashboard/page.tsx       # Score dashboard
│   │   │   ├── report/page.tsx          # Full credit report
│   │   │   ├── developers/page.tsx      # Developer portal
│   │   │   ├── explorer/page.tsx        # Wallet explorer
│   │   │   ├── settings/page.tsx        # User settings
│   │   │   └── api/v1/                  # REST API routes
│   │   │       ├── score/route.ts       # GET  — credit score
│   │   │       ├── score/detailed/route.ts  # POST — detailed score
│   │   │       ├── verify/route.ts      # GET  — verify attestation
│   │   │       ├── history/route.ts     # GET  — score history
│   │   │       ├── attest/route.ts      # POST — create attestation
│   │   │       ├── report/route.ts      # GET  — full report
│   │   │       ├── webhook/register/route.ts  # POST — register webhook
│   │   │       ├── health/route.ts      # GET  — service health
│   │   │       ├── waitlist/route.ts    # POST — join waitlist
│   │   │       ├── stats/route.ts       # GET  — platform stats
│   │   │       ├── recent-scores/route.ts   # GET  — recently scored wallets
│   │   │       └── reclaim/callback/route.ts  # POST — Reclaim proof callback
│   │   ├── components/
│   │   │   ├── credit/                  # 10 credit-specific components
│   │   │   ├── landing/                 # 5 landing page sections
│   │   │   ├── layout/                  # Header, Footer
│   │   │   └── scaffold-eth/            # Scaffold-ETH components
│   │   ├── hooks/                       # 4 custom hooks + scaffold-eth hooks
│   │   ├── lib/
│   │   │   ├── scoring/                 # Deterministic algorithm + ML client
│   │   │   ├── data/                    # GoldRush, The Graph, Cred Protocol, Aggregator
│   │   │   ├── attestation/             # EAS SDK wrapper + schema registration
│   │   │   ├── reclaim/                 # Reclaim Protocol SDK integration
│   │   │   ├── supabase/               # Database clients
│   │   │   ├── constants.ts            # Chain configs, EAS addresses
│   │   │   ├── animations.ts           # Framer Motion presets
│   │   │   └── utils.ts                # Utility functions
│   │   ├── types/
│   │   │   └── credit.ts               # All TypeScript types + constants
│   │   └── styles/globals.css           # Tailwind + design tokens
│   │
│   ├── foundry/                         # Smart contracts
│   │   ├── contracts/
│   │   │   ├── CreditScoreRegistry.sol  # On-chain score hash storage
│   │   │   ├── CreditPassport.sol       # Soulbound ERC-721 passport
│   │   │   └── MultiWalletLinker.sol    # Wallet linking via signatures
│   │   ├── test/                        # 50 Forge tests (all passing)
│   │   │   ├── CreditScoreRegistry.t.sol
│   │   │   ├── CreditPassport.t.sol
│   │   │   └── MultiWalletLinker.t.sol
│   │   └── script/Deploy.s.sol          # Deployment script
│   │
│   └── sdk/                             # npm SDK (@credbureau/sdk)
│       └── src/
│           ├── index.ts                 # CredBureau class + namespaces
│           ├── client.ts                # HTTP client with retry
│           └── types.ts                 # Public types
│
├── ml-service/                          # Python ML service
│   ├── app/
│   │   ├── main.py                      # FastAPI app
│   │   ├── api/routes.py                # /predict, /health, /model-info
│   │   ├── api/schemas.py               # Pydantic models
│   │   ├── models/credit_model.py       # Model wrapper + fallback
│   │   ├── models/feature_engineering.py # Feature pipeline
│   │   └── config.py                    # Environment config
│   ├── train.py                         # Training pipeline
│   ├── export_training_data.py          # Export from Supabase
│   ├── requirements.txt
│   └── Dockerfile
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql       # 8 tables with RLS
        └── 002_allow_anonymous_scores.sql
```

---

## Credit Scoring Algorithm

### Overview

The scoring engine computes a FICO-equivalent credit score from **300 to 850** based on on-chain wallet behavior. It uses a deterministic weighted model as the primary engine, optionally blended with an XGBoost ML model.

### Scoring Formula

```
Final Score = Base(300) + walletAge + txFrequency + defiDiversity
            + repaymentHistory + liquidationPenalty + stablecoinRatio
            + totalValue + offChainBonus

Clamped to range [300, 850]
```

### Factor Breakdown

| Factor | Weight | Max Score | How It's Calculated |
|--------|--------|-----------|-------------------|
| **Wallet Age** | 15% | 150 pts | Real first-tx date from GoldRush SDK. 0 pts (<30 days), 50 pts (30-180d), 100 pts (180-365d), 150 pts (>1 year) |
| **Tx Frequency** | 5% | 100 pts | Total transactions across all chains. 0 pts (<10), 30 pts (10-50), 60 pts (50-200), 100 pts (>200) |
| **DeFi Diversity** | 10% | 100 pts | Unique DeFi protocols detected from token holdings (aTokens, cTokens, stETH, etc.) + Aave subgraph. 0 pts (none), 25 pts (1-2), 50 pts (3-5), 75 pts (6-10), 100 pts (>10) |
| **Repayment History** | 30% | 200 pts | Repayment ratio from Aave V3 subgraph (repays/borrows). 0 pts (<50%), 50 pts (50-75%), 100 pts (75-90%), 150 pts (90-99%), 200 pts (100%). Neutral 100 pts if no borrows. |
| **Liquidation Penalty** | 25% | -150 pts | Liquidation events from Aave subgraph. 0 pts (none), -50 pts (1), -100 pts (2-3), -150 pts (>3) |
| **Stablecoin Ratio** | 10% | 100 pts | Portfolio stability from token balances. 0 pts (<5%), 25 pts (5-15%), 50 pts (15-30%), 75 pts (30-50%), 100 pts (>50%) |
| **Portfolio Value** | 5% | 100 pts | Total USD value across chains. 0 pts (<$100), 25 pts ($100-1K), 50 pts ($1K-10K), 75 pts ($10K-100K), 100 pts (>$100K) |
| **Off-Chain Bonus** | — | 100 pts | Via Reclaim Protocol: FICO >700 (+50), Bank balance >$10K (+30), Income >$50K/yr (+20). Cap: 100 pts. |

### Risk Tiers

| Tier | Score Range | Color | Hex |
|------|------------|-------|-----|
| Excellent | 750 - 850 | Green | `#10B981` |
| Good | 680 - 749 | Blue | `#3B82F6` |
| Fair | 620 - 679 | Amber | `#F59E0B` |
| Poor | 550 - 619 | Orange | `#F97316` |
| Very Poor | 300 - 549 | Red | `#EF4444` |

### ML Enhancement

When the Python ML service is running:
- **Blend**: 70% deterministic + 30% XGBoost prediction
- **Model Version**: `1` = deterministic only, `2` = ML-blended
- **Fallback**: If ML service is down, automatically uses 100% deterministic (graceful degradation)
- **Confidence**: 0.0-1.0 based on data completeness and ML confidence

### Data Sources

| Source | What It Provides | SDK Used |
|--------|-----------------|----------|
| **GoldRush/Covalent** | Token balances, tx history, first-tx date, NFTs, DeFi token detection | `@covalenthq/client-sdk` |
| **The Graph (Aave V3)** | Borrow/repay/liquidation events with USD values | GraphQL queries to Aave subgraphs |
| **Cred Protocol** | Baseline credit score (300-1000) as calibration signal | REST API |
| **Reclaim Protocol** | FICO score, bank balance, income (off-chain, via zkTLS) | `@reclaimprotocol/js-sdk` |

All data sources are fetched in parallel via `Promise.allSettled` — no single source failure blocks the score. The `confidence` field reflects how many sources succeeded.

---

## Frontend Pages

### 1. Landing Page (`/`)

The marketing homepage with 5 sections:

- **Hero Section**: Full-viewport with animated gradient headline "The Credit Bureau for DeFi", subheadline, and two CTAs ("Check Your Score" + "For Developers"). Dark navy background with radial gradient and grid overlay.
- **Stats Bar**: 4 dynamic counters fetched from `/api/v1/stats` — Wallets Scored, Chains Supported (4), Attestations Created, Max Score (850). Numbers animate on scroll.
- **How It Works**: 3-step horizontal flow — Connect Wallet, Get Scored, Mint Passport. Each step has an icon, title, and description with stagger animations.
- **Developer Section**: Two-column layout with SDK code snippet (syntax-highlighted in a terminal-style card) and CTA to developer portal.
- **Waitlist CTA**: Email input form that inserts into Supabase `waitlist` table via `/api/v1/waitlist`. Handles duplicates gracefully.

### 2. Dashboard (`/dashboard`)

The main user interface after wallet connection:

- **Score Gauge**: Large SVG circular arc (270 degrees) with animated stroke colored by risk tier. Score number in center with count-up animation. Glowing shadow effect matching tier color.
- **Summary Cards**: 4 cards showing Risk Tier, Confidence %, Chains Analyzed, and Model Version.
- **Score Breakdown**: 8 cards in a responsive grid — one for each scoring factor. Each shows factor name, icon, score/maxScore with animated progress bar, weight percentage, and detail text.
- **Action Cards**: 3 cards linking to Mint Credit Passport, View Full Report, and Link Another Wallet.
- **Loading State**: Full skeleton matching the layout grid.
- **Error State**: Retry button with error message.
- **Empty State**: "Connect Your Wallet" prompt when no wallet connected.

### 3. Credit Report (`/report`)

Professional-looking credit report page:

- **Executive Summary**: Score + tier + model version + confidence + chains analyzed + off-chain status.
- **Score Breakdown**: All 8 factors with progress bars, scores, and explanations.
- **Score History**: Timeline of past scores with timestamps and tiers.
- **Actions**: Download PDF button, Share Report button.
- **Disclaimer**: Legal text about the report not being financial advice.

### 4. Developer Portal (`/developers`)

Tabbed interface for protocol integrators:

- **Overview Tab**: Quick start guide (3 steps: install SDK, init client, fetch score). Feature cards for REST API, TypeScript SDK, and Webhooks.
- **API Reference Tab**: All 12 endpoints listed with method badges (GET/POST), paths, descriptions, and parameters.
- **SDK Tab**: Installation command and full usage code sample with copy button.
- **API Keys Tab**: Create/manage API keys for authenticated access.

### 5. Explorer (`/explorer`)

Public wallet search and recently scored wallets:

- **Search Bar**: Address input with validation. Searches any wallet and displays score, risk tier, and timestamp.
- **Recently Scored**: Dynamic grid of 6 most recently scored wallets, fetched from `/api/v1/recent-scores`. Shows address, score, tier badge, and date. Falls back to "No wallets scored yet" if empty.

### 6. Settings (`/settings`)

User preferences with vertical tab navigation:

- **Profile**: Wallet address display, optional email input.
- **Wallets**: Linked wallets list with primary badge, link/unlink buttons.
- **Notifications**: Toggle switches for score changes, attestation expiry, liquidation alerts, weekly report.
- **Privacy**: Public score toggle, leaderboard opt-in, "Delete My Data" button.
- **API Keys**: Generate and manage API keys.
- **Export**: Download all data as JSON.

---

## REST API Reference

All endpoints are under `/api/v1/`. Base URL: `http://localhost:3000/api/v1/`

### Score Endpoints

#### `GET /score`
Get credit score for a wallet address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address (0x...) |
| `chains` | string | No | Comma-separated chain names (default: eth-mainnet,base-mainnet,arbitrum-mainnet) |

**Response** (200):
```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "score": 742,
  "riskTier": "Good",
  "breakdown": {
    "walletAge": { "score": 150, "maxScore": 150, "weight": 0.15, "details": "Wallet age: 3847 days" },
    "txFrequency": { "score": 100, "maxScore": 100, "weight": 0.05, "details": "Transaction count: 1247" },
    "defiDiversity": { "score": 75, "maxScore": 100, "weight": 0.1, "details": "DeFi protocols used: 8" },
    "repaymentHistory": { "score": 200, "maxScore": 200, "weight": 0.3, "details": "Repayment ratio: 100% (5 borrows)" },
    "liquidationPenalty": { "score": 0, "maxScore": 150, "weight": 0.25, "details": "Liquidations: 0" },
    "stablecoinRatio": { "score": 75, "maxScore": 100, "weight": 0.1, "details": "Stablecoin ratio: 42.3%" },
    "totalValue": { "score": 100, "maxScore": 100, "weight": 0.05, "details": "Total portfolio: $847,231" },
    "offChainBonus": { "score": 0, "maxScore": 100, "weight": 0, "details": "No off-chain data verified" }
  },
  "confidence": 1,
  "timestamp": "2026-03-25T12:00:00.000Z",
  "modelVersion": 1,
  "chains": ["eth-mainnet", "base-mainnet", "arbitrum-mainnet"],
  "dataSources": ["goldrush", "aave_subgraph"],
  "failedSources": [],
  "cached": false
}
```

#### `POST /score/detailed`
Get detailed score with optional off-chain data.

**Body**: `{ "address": "0x...", "chains": ["eth-mainnet"], "includeOffChain": true }`

#### `GET /history`
Get score history for an address. Returns up to 100 past scores ordered by most recent.

#### `GET /report`
Full credit report including score, history, attestations, and off-chain verifications.

### Attestation Endpoints

#### `POST /attest`
Create an EAS attestation of the latest score. Schema is auto-registered on first use.

**Body**: `{ "address": "0x...", "chain": "base-sepolia" }`

**Response** (200):
```json
{
  "attestationUID": "0xabc123...",
  "txHash": "0xdef456...",
  "chain": "base-sepolia",
  "easScanURL": "https://base-sepolia.easscan.org/attestation/view/0xabc123..."
}
```

#### `GET /verify`
Verify an existing attestation. Checks if it's valid, expired, or revoked.

**Parameters**: `attestationUID` (required), `chain` (default: base-sepolia)

### Platform Endpoints

#### `GET /stats`
Dynamic platform statistics from Supabase.

```json
{
  "walletsScored": 42,
  "attestationsCreated": 15,
  "chainsSupported": 4,
  "scoreRange": "300-850"
}
```

#### `GET /recent-scores`
6 most recently scored unique wallets for the Explorer page.

#### `POST /waitlist`
Join the waitlist. Handles duplicate emails gracefully.

**Body**: `{ "email": "user@example.com" }`

#### `POST /reclaim/callback`
Callback endpoint for Reclaim Protocol proof verification. Verifies the proof and stores in Supabase.

#### `POST /webhook/register`
Register a webhook for real-time notifications. Events: `score_change`, `liquidation`, `attestation_expired`, `attestation_created`.

#### `GET /health`
Service health check including ML service status and chain connectivity.

---

## React Components

### Credit Components (`components/credit/`)

| Component | Props | Description |
|-----------|-------|-------------|
| **ScoreGauge** | `score: number, size?: "sm"\|"md"\|"lg", animated?: boolean` | SVG circular gauge (270-degree arc) with animated stroke and count-up score display. Colors by risk tier with glow shadow. Sizes: sm=120px, md=200px, lg=280px. |
| **ScoreBreakdownCard** | `factor: ScoreFactor, name: string, icon: ReactNode` | Glassmorphism card with animated progress bar, score/maxScore, weight %, trend arrow, and detail text. Hover scale effect. |
| **RiskTierBadge** | `tier: RiskTier, size?: "sm"\|"md"\|"lg"` | Colored badge with risk tier label and optional animated pulse dot. |
| **ScoreHistoryChart** | `data: {score, timestamp}[], timeRange: string` | Recharts AreaChart with gradient fill, custom dark-themed tooltip, and responsive container. |
| **PercentileRanking** | `percentile: number, totalWallets?: number` | Gradient distribution bar with animated position marker and "Top X%" text. |
| **LinkedWalletsPanel** | `wallets: LinkedWallet[], onLinkWallet, onUnlinkWallet` | Wallet list with truncated addresses, chain badges, primary badge, and link/unlink actions. |
| **OffChainVerification** | `verifications, onVerify` | Grid of 4 verification provider cards (FICO, Bank Balance, Income, Identity) with verified/unverified status and "Verify Now" buttons. |
| **AttestationSection** | `attestations: Attestation[], onMint, isMinting` | "Mint Credit Passport" button with chain selector. Lists existing attestations with UID, chain, timestamp, expiry countdown, and EASScan link. |
| **ImprovementTips** | `breakdown: ScoreBreakdown` | Auto-generates improvement suggestions from lowest-scoring factors, sorted by potential impact. |
| **ChainSelector** | `chains, selected, onChange` | Segmented control to select chain or "All Chains" aggregate view. |

### Landing Components (`components/landing/`)

| Component | Description |
|-----------|-------------|
| **Hero** | Full-viewport hero with gradient headline, mesh background, and CTAs. |
| **StatsBar** | 4-column animated counter stats fetched from `/api/v1/stats` with scroll-triggered count-up. |
| **HowItWorks** | 3-step flow (Connect, Score, Mint) with stagger animation on scroll. |
| **DeveloperSection** | Two-column layout with terminal-style code snippet and SDK/API tabs. |
| **WaitlistCTA** | Email signup form → real Supabase insert via `/api/v1/waitlist`. Loading/success/error states. |

### Layout Components

| Component | Description |
|-----------|-------------|
| **Header** (`components/Header.tsx`) | Sticky header with CredBureau logo, nav links (Dashboard, Report, Explorer, Developers, Settings), RainbowKit connect button, theme toggle. Mobile hamburger menu. Backdrop blur effect. |
| **Footer** (`components/Footer.tsx`) | Links, "Built on Scaffold-ETH 2" attribution. |

---

## Custom Hooks

| Hook | Signature | Description |
|------|-----------|-------------|
| **useCreditScore** | `(address?: string) => { score, isLoading, isError, error, refetch }` | Fetches credit score from `/api/v1/score`. Auto-fetches on address change. Returns typed `CreditScore` object. |
| **useScoreHistory** | `(address?: string) => { history, isLoading, isError }` | Fetches score history from `/api/v1/history`. Returns array of `ScoreHistoryPoint`. |
| **useAttestation** | `() => { mint, isMinting, error }` | Creates EAS attestations via `/api/v1/attest`. `mint(address, chain)` returns `AttestationResult`. |
| **useLinkedWallets** | `(primaryAddress?: string) => { wallets, isLoading, linkWallet, unlinkWallet, isLinking }` | Manages linked wallets via Supabase. Link/unlink with automatic refetch. |

All hooks include proper error logging (no silent failures).

---

## Core Libraries

### `lib/scoring/deterministic.ts`
The main credit scoring algorithm. Pure function `computeCreditScore(profile, offChainData?)` that takes a `WalletProfile` and returns a `CreditScore` with full breakdown. 7 individual scoring functions + off-chain bonus calculator.

### `lib/scoring/ml-client.ts`
HTTP client for the Python ML service. `getMLPrediction(profile)` calls `POST /predict` on the FastAPI service with a 5-second timeout. `blendScores(deterministic, ml)` merges at 70/30 ratio. Returns `null` gracefully if ML service is down.

### `lib/data/goldrush.ts`
GoldRush/Covalent SDK integration using `@covalenthq/client-sdk`. Singleton `GoldRushClient` with three methods:
- `getTokenBalances()` — Token balances + stablecoin detection + DeFi protocol token detection (Aave aTokens, Compound cTokens, Lido stETH/wstETH, Rocket Pool rETH, Curve, Convex, Yearn)
- `getTransactionSummary()` — Transaction count + **real first-transaction date** from `earliest_transaction.block_signed_at`
- `getNftCount()` — NFT count
- `getWalletDataMultiChain()` — Aggregates all above across 4 chains in parallel

### `lib/data/thegraph.ts`
The Graph integration for Aave V3 subgraphs. Queries `borrows`, `repays`, and `liquidationCalls` entities with USD price calculations. Supports Ethereum, Base, Arbitrum, Optimism subgraphs. `getAaveDataMultiChain()` aggregates across chains.

### `lib/data/cred-protocol.ts`
Cred Protocol REST API client. Fetches baseline credit scores (300-1000) as a calibration signal. Configurable base URL via `CRED_PROTOCOL_API_URL` env var.

### `lib/data/aggregator.ts`
Central orchestrator that runs GoldRush + Aave subgraph fetches in parallel via `Promise.allSettled`. Produces a unified `WalletProfile` with:
- Real wallet age from first-tx date (not heuristic)
- Real DeFi protocol count from token detection + Aave confirmation
- Populated `defiProtocols[]` array with actual protocol names
- Confidence score based on data source success rate

### `lib/attestation/eas.ts`
EAS SDK wrapper for creating and verifying attestations. `createCreditScoreAttestation()` encodes score data with `SchemaEncoder` and creates on-chain attestations with 30-day expiry (revocable). `verifyAttestation()` reads and decodes attestations, checking expiry and revocation status.

### `lib/attestation/register-schema.ts`
Auto-registration utility. `getOrRegisterSchemaUid(chain, signer)` checks an in-memory cache, then registers the CredBureau schema on-chain via `SchemaRegistry` if not yet registered. Schema: `uint16 creditScore, uint8 riskTier, uint256 timestamp, address wallet, bytes32 dataHash, bool hasOffChainData, uint8 modelVersion`.

### `lib/reclaim/client.ts`
Reclaim Protocol SDK integration using `@reclaimprotocol/js-sdk`. `createProofRequest()` initializes `ReclaimProofRequest` with real SDK calls (not stubs). `verifyReclaimProof()` validates proofs and extracts data. Provider IDs are configurable via environment variables.

### `lib/supabase/client.ts` + `server.ts`
Supabase clients for browser (anon key) and server (service role key). Server client bypasses RLS for API routes.

### `lib/constants.ts`
Chain configs, EAS contract addresses (mainnet + testnet), schema registry addresses, Aave V3 subgraph URLs, EASScan URLs, rate limits, cache TTLs. Default attestation chain: `base-sepolia`.

### `lib/animations.ts`
Framer Motion presets: `springConfig`, `gentleSpring`, `pageTransition`, `fadeIn`, `slideInFromBottom`, `staggerContainer`, `staggerItem`, `gaugeAnimation`, `counterSpring`. All with properly typed `ease` values.

### `lib/utils.ts`
Utility functions: `cn()` (Tailwind class merge), `truncateAddress()`, `formatNumber()`, `formatUsd()`, `timeAgo()`.

### `types/credit.ts`
All TypeScript type definitions: `CreditScore`, `ScoreBreakdown`, `ScoreFactor`, `RiskTier`, `WalletProfile`, `LinkedWallet`, `Attestation`, `AttestationResult`, `VerificationResult`, `CreditReport`, `LendingEvent`, `ProtocolInteraction`, `RiskFactor`, `ApiKeyInfo`, `WebhookConfig`. Also exports constants: `SCORE_MIN`, `SCORE_MAX`, `RISK_TIER_RANGES`, `RISK_TIER_COLORS`, `getRiskTier()`.

---

## Smart Contracts

3 Solidity contracts deployed via Foundry with **50 tests all passing**.

### CreditScoreRegistry.sol

Stores credit score hashes on-chain for trustless verification. Only authorized attesters can write scores.

| Function | Access | Description |
|----------|--------|-------------|
| `registerScore(address, bytes32, uint256)` | Attester/Owner | Store score hash + timestamp |
| `getScore(address)` | Public | Get latest score hash + timestamp |
| `getScoreHistory(address)` | Public | Get all historical score records |
| `isScoreValid(address)` | Public | Check if score is within TTL (default 30 days) |
| `addAttester(address)` | Owner | Authorize a new attester |
| `removeAttester(address)` | Owner | Revoke attester authorization |
| `setScoreTTL(uint256)` | Owner | Update score validity period |

**Events**: `ScoreUpdated(address indexed wallet, bytes32 scoreHash, uint256 timestamp)`

### CreditPassport.sol

Soulbound (non-transferable) ERC-721 NFT representing a user's credit identity. One passport per address.

| Function | Access | Description |
|----------|--------|-------------|
| `mint(address, string)` | Attester/Owner | Mint passport with metadata URI |
| `burn(uint256)` | Owner of token | Destroy passport |
| `updateMetadata(uint256, string)` | Attester/Owner | Update dynamic metadata URI |
| `tokenURI(uint256)` | Public | Get metadata URI |

All transfer functions (`transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll`) revert with `SoulboundTransferBlocked()`.

### MultiWalletLinker.sol

On-chain wallet linking registry using ECDSA signature verification. Links secondary wallets to a primary wallet for unified credit identity.

| Function | Access | Description |
|----------|--------|-------------|
| `linkWallet(primary, linked, signature)` | Anyone with valid sig | Link wallet with ECDSA proof |
| `unlinkWallet(address)` | Primary or linked wallet | Remove a linked wallet |
| `getLinkedWallets(address)` | Public | Get all wallets linked to a primary |
| `getNonce(address)` | Public | Get signing nonce for replay protection |

**Signature message**: `keccak256(abi.encodePacked(primary, linked, nonce, chainId, contractAddress))`

**Events**: `WalletsLinked(address indexed primary, address indexed secondary)`, `WalletUnlinked(address indexed primary, address indexed secondary)`

### Tests (50 passing)

```
CreditScoreRegistry.t.sol  — 11 tests (register, read, history, TTL, access control)
CreditPassport.t.sol       — 15 tests (mint, soulbound blocks, metadata, burn, ERC-165)
MultiWalletLinker.t.sol    — 15 tests (link, unlink, signatures, replay protection)
YourContract.t.sol         —  9 tests (Scaffold-ETH default)
```

Run: `yarn foundry:test`

---

## npm SDK (`@credbureau/sdk`)

Zero-dependency TypeScript SDK wrapping the REST API. Builds to ESM + CJS via tsup.

### Installation

```bash
npm install @credbureau/sdk
```

### Usage

```typescript
import { CredBureau } from '@credbureau/sdk';

const cb = new CredBureau({
  apiKey: 'cb_live_your_key',
  baseUrl: 'https://your-deployment.vercel.app', // optional
});

// Get credit score
const score = await cb.score.get({
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  chains: ['eth-mainnet', 'base-mainnet'],
});
console.log(score.score);    // 742
console.log(score.riskTier); // "Good"

// Get detailed score with off-chain data
const detailed = await cb.score.getDetailed({
  address: '0x...',
  includeOffChain: true,
});

// Get score history
const history = await cb.score.getHistory({ address: '0x...' });

// Create on-chain attestation
const attestation = await cb.attestation.create({
  address: '0x...',
  chain: 'base-sepolia',
});
console.log(attestation.easScanUrl); // EASScan link

// Verify attestation
const verification = await cb.attestation.verify({
  attestationUID: '0xabc...',
  chain: 'base-sepolia',
});
console.log(verification.valid); // true/false

// Get full report
const report = await cb.report.get({ address: '0x...' });

// Register webhook
const webhook = await cb.webhook.register({
  url: 'https://your-app.com/webhook',
  events: ['score_change', 'attestation_created'],
});
```

### Namespaces

| Namespace | Methods |
|-----------|---------|
| `cb.score` | `get(params)`, `getDetailed(params)`, `getHistory(params)` |
| `cb.attestation` | `create(params)`, `verify(params)` |
| `cb.report` | `get(params)` |
| `cb.webhook` | `register(params)` |

### Error Handling

The SDK uses `CredBureauError` with `code`, `message`, and `status` fields. Automatic retry with exponential backoff for 5xx errors.

---

## ML Service (Python FastAPI)

Optional AI enhancement for credit scoring. Runs independently on port 8000.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/predict` | Accept 14 wallet features, return predicted score (300-850) |
| `GET` | `/health` | Service health + model status |
| `GET` | `/model-info` | Model version, features list, training date |

### Predict Request

```json
{
  "wallet_age_days": 365,
  "tx_count": 150,
  "unique_active_months": 12,
  "defi_protocol_count": 5,
  "total_borrows": 100000,
  "total_repays": 95000,
  "repayment_ratio": 0.95,
  "liquidation_count": 0,
  "liquidation_volume_usd": 0,
  "stablecoin_ratio": 0.3,
  "total_value_usd": 50000,
  "token_count": 15,
  "nft_count": 2,
  "governance_participation": 0,
  "bridge_usage_count": 0
}
```

### Model Details

- **Algorithm**: XGBoost Regressor (300 estimators, depth 6, learning rate 0.05)
- **Features**: 14 wallet metrics + 6 derived features (log transforms, ratios)
- **Output**: Score 300-850 clamped
- **Fallback**: Deterministic weighted model if no trained model exists
- **Training**: `python train.py` (synthetic data) or `python train.py --csv data.csv` (real data)
- **Export real data**: `python export_training_data.py --output data/training_data.csv` (from Supabase)

### Running

```bash
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python train.py                        # Train model
uvicorn app.main:app --reload --port 8000  # Start service
```

---

## Database Schema (Supabase)

8 tables with Row-Level Security (RLS) enabled.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **users** | User accounts | `id` (uuid), `primary_wallet` (unique), `email`, `settings` (jsonb) |
| **linked_wallets** | Multi-wallet linking | `user_id` (FK), `wallet_address`, `chain`, `signature`, unique(address,chain) |
| **credit_scores** | Score history | `wallet_address`, `score` (300-850 check), `risk_tier`, `breakdown` (jsonb), `model_version`, `chains[]`, `confidence` |
| **attestations** | EAS attestation records | `attestation_uid`, `chain`, `tx_hash`, `schema_uid`, `expires_at`, `revoked` |
| **offchain_verifications** | Reclaim Protocol proofs | `verification_type` (fico/bank/income/identity), `proof_hash`, `metadata` (jsonb) |
| **api_keys** | Developer API keys | `key_hash` (unique), `tier` (free/pro/enterprise), `rate_limit`, `revoked` |
| **webhooks** | Webhook registrations | `url`, `events[]`, `secret`, `active` |
| **waitlist** | Email signups | `email` (unique), `wallet_address` |

### Migrations

1. `001_initial_schema.sql` — Creates all 8 tables with constraints, indexes, RLS policies
2. `002_allow_anonymous_scores.sql` — Makes `user_id` nullable for public scoring via API

---

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0A0E27` | Page background |
| Surface | `#111631` | Elevated surfaces |
| Card | `#1A1F3D` | Card backgrounds (often at 50% opacity with backdrop-blur) |
| Border | `#2A2F4D` | All borders and dividers |
| Primary | `#3B82F6` | Buttons, links, active states |
| Secondary | `#06B6D4` | Accent color (cyan) |

### Typography

- **Headings**: Inter (loaded via `next/font/google`)
- **Code/Numbers**: JetBrains Mono (loaded via `next/font/google`)
- **CSS Variables**: `--font-inter`, `--font-mono`

### Component Patterns

- **Cards**: `rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D] backdrop-blur-sm`
- **Buttons (primary)**: `px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl`
- **Buttons (outline)**: `px-6 py-3 border border-gray-600 text-gray-300 hover:text-white rounded-xl`
- **Inputs**: `bg-[#1A1F3D] border border-[#2A2F4D] rounded-xl text-white focus:border-blue-500`
- **Score glow**: `box-shadow: 0 0 60px rgba(tierColor, 0.2)`

### Animations (Framer Motion)

- `springConfig`: stiffness 260, damping 20
- `gentleSpring`: stiffness 120, damping 14
- `staggerContainer`: children stagger 0.1s with 0.05s delay
- `pageTransition`: fade + slide up/down
- `gaugeAnimation`: 1.5s arc fill with easeOut
- `counterSpring`: stiffness 50, damping 15 (score count-up)

---

## Environment Variables

### Required

| Variable | Source | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [supabase.com](https://supabase.com) → Settings → API | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page | Supabase service role key (server-side only) |
| `GOLDRUSH_API_KEY` | [goldrush.dev](https://goldrush.dev) → Dashboard | GoldRush/Covalent API key |
| `EAS_ATTESTER_PRIVATE_KEY` | `yarn account:generate` + `yarn account:reveal-pk` | Private key for signing attestations |

### Optional

| Variable | Source | Description |
|----------|--------|-------------|
| `CRED_PROTOCOL_API_KEY` | [app.credprotocol.com](https://app.credprotocol.com) | Baseline credit scores |
| `CRED_PROTOCOL_API_URL` | — | API base URL (default: `https://api.credprotocol.com/api`) |
| `RECLAIM_APP_ID` | [dev.reclaimprotocol.org](https://dev.reclaimprotocol.org) | Off-chain verification |
| `RECLAIM_APP_SECRET` | Same | Reclaim app secret |
| `RECLAIM_FICO_PROVIDER_ID` | Reclaim provider catalog | FICO score provider |
| `RECLAIM_BANK_PROVIDER_ID` | Same | Bank balance provider |
| `RECLAIM_INCOME_PROVIDER_ID` | Same | Income provider |
| `ML_SERVICE_URL` | — | ML service URL (default: `http://localhost:8000`) |

### Pre-filled (testnet RPCs — free, no signup)

| Variable | Default Value |
|----------|---------------|
| `BASE_SEPOLIA_RPC_URL` | `https://sepolia.base.org` |
| `SEPOLIA_RPC_URL` | `https://rpc.sepolia.org` |
| `ARBITRUM_SEPOLIA_RPC_URL` | `https://sepolia-rollup.arbitrum.io/rpc` |
| `OPTIMISM_SEPOLIA_RPC_URL` | `https://sepolia.optimism.io` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_CHAIN` | `baseSepolia` |

---

## Setup & Running

### Prerequisites

- Node.js 20.18.3+
- Yarn (installed via `npm install -g yarn`)
- Python 3.10+ (for ML service)
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)

### Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Set up environment
# Fill in SUPABASE + GOLDRUSH + EAS keys in packages/nextjs/.env.local

# 3. Run Supabase migrations (in Supabase SQL Editor)
# Paste: supabase/migrations/001_initial_schema.sql
# Paste: supabase/migrations/002_allow_anonymous_scores.sql

# 4. Start local chain (Terminal 1)
yarn chain

# 5. Deploy contracts (Terminal 2)
yarn deploy

# 6. Start the app (Terminal 3)
yarn start
# → http://localhost:3000

# 7. (Optional) Start ML service (Terminal 4)
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn app.main:app --reload --port 8000
```

### Getting Free Testnet ETH

For your EAS attester wallet (to mint attestations on Base Sepolia):

1. [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet) (select Base Sepolia)
3. [QuickNode Faucet](https://faucet.quicknode.com/base/sepolia)

---

## Testing

### Smart Contract Tests

```bash
yarn foundry:test
# 50 tests, 4 suites, all passing
```

### TypeScript Type Check

```bash
yarn workspace @se-2/nextjs build
# ✓ Compiled successfully
```

### API Testing

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Score a wallet
curl "http://localhost:3000/api/v1/score?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

# Score history
curl "http://localhost:3000/api/v1/history?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

---

## Deployment

### Frontend (Vercel)

```bash
yarn vercel
```

### Smart Contracts (Base Sepolia)

```bash
yarn deploy --network baseSepolia
```

### ML Service (Docker)

```bash
cd ml-service
docker build -t credbureau-ml .
docker run -p 8000:8000 credbureau-ml
```

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Deterministic scoring as primary** | Reproducible, auditable, no model dependency. ML enhances but never blocks. |
| **Promise.allSettled for data fetching** | No single data source failure blocks scoring. Confidence field shows completeness. |
| **EAS for attestations** | Standard, widely adopted, on-chain verifiable. Revocable + expirable. |
| **Base Sepolia as default** | Cheapest L2 testnet. EAS deployed at predeploy addresses. ~$0.005/attestation on mainnet. |
| **Auto-register EAS schemas** | No manual deployment step. Registers on first attestation per chain. |
| **Soulbound passport NFT** | Non-transferable ensures credit identity stays with the wallet. |
| **GoldRush SDK over raw fetch** | Typed responses, built-in error handling, `getTransactionSummary` gives real first-tx date. |
| **Supabase over custom DB** | Instant setup, built-in RLS, real-time subscriptions, free tier (500MB). |
| **Reclaim Protocol for off-chain** | zkTLS enables privacy-preserving verification without exposing raw financial data. |

---

## License

See [LICENCE](LICENCE) file.

---

Built with [Scaffold-ETH 2](https://scaffoldeth.io)
