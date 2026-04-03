# CredBureau User Journeys

This document describes the complete user journeys for CredBureau, covering three primary personas: DeFi borrowers, lending protocol developers, and Solana users.

---

## Journey 1: DeFi Borrower

**Goal:** Prove creditworthiness to borrow with less collateral.

### Step 1: Discover

- User finds CredBureau via Twitter, hackathon, or protocol recommendation.
- Lands on the landing page and sees "The Credit Bureau for DeFi" headline.
- Stats bar shows wallets scored, 6 chains supported, attestations created.
- Clicks "Check Your Score".

### Step 2: Connect Wallet

- RainbowKit modal appears with MetaMask, Coinbase Wallet, WalletConnect, etc.
- User approves connection (read-only signature, no transaction).
- Redirected to `/dashboard`.

### Step 3: Score Calculation

Dashboard shows a loading skeleton while the scoring pipeline runs:

1. Frontend calls `GET /api/v1/score?address=0x...&chains=base-mainnet,arbitrum-mainnet,optimism-mainnet`
2. Server fetches data in parallel:
   - **GoldRush SDK:** Token balances, tx history, first-tx date across 4 EVM chains
   - **The Graph:** Aave V3 borrow/repay/liquidation events with USD values
3. Data merged into a `WalletProfile`
4. Deterministic algorithm computes score from 7 weighted factors
5. If ML service is running: blends 70% deterministic + 30% XGBoost
6. Score + breakdown saved to Supabase

Dashboard animates in:
- Score gauge fills from 0 to final score (e.g. 742)
- Risk tier badge appears ("Good" in blue)
- 8 breakdown cards populate with individual factor scores
- Percentile ranking shows position among all scored wallets

### Step 4: Explore Your Score

User sees 8 scoring factors with progress bars:

| Factor | Score | Max | Example |
|--------|-------|-----|---------|
| Wallet Age | 150 | 150 | 3+ year old wallet |
| Tx Frequency | 100 | 100 | 1,200+ transactions |
| DeFi Diversity | 75 | 100 | 8 protocols used |
| Repayment History | 200 | 200 | 100% repayment on Aave |
| Liquidation Penalty | 0 | -150 | Never liquidated |
| Stablecoin Ratio | 75 | 100 | 42% stablecoins |
| Portfolio Value | 100 | 100 | $100K+ portfolio |
| Off-Chain Bonus | 0 | 100 | Not yet verified |

Improvement tips suggest actionable steps to increase score.

### Step 5: Mint Credit Passport

1. User clicks "Mint Credit Passport"
2. Chain selector shows: Base (recommended), Arbitrum, Optimism, Solana
3. On Base: gas is sponsored via Coinbase CDP Paymaster (free)
4. On other chains: gas cost shown (~$0.01-0.05 on L2s)
5. User clicks "Mint" and signs the transaction
6. Loading animation for 5-15 seconds
7. Confetti animation on success
8. Attestation appears in history with EASScan link, score, expiry (30 days)

### Step 6: Use the Passport

The attestation is now on-chain. Any lending protocol can:
1. Read the attestation from the EAS contract
2. Check `creditScore >= threshold`
3. Verify `expirationTime > block.timestamp` and `revocationTime == 0`
4. Offer reduced collateral to the borrower

### Step 7: Maintain Your Score

- Score expires after 30 days; user returns to refresh and re-mint
- Score changes based on new on-chain activity
- Liquidations cause significant score drops
- Improvement tips update based on current weakest factors

---

## Journey 2: Lending Protocol Developer

**Goal:** Integrate credit scoring into a lending protocol.

### Step 1: Discover

- Developer visits `/developers` page
- Sees API reference, SDK documentation, and integration guides

### Step 2: Get API Key

1. Click "Create API Key" in the developer portal
2. Connect wallet
3. Receive API key (shown once, stored as hash in Supabase)
4. Free tier: 1,000 score lookups per month

### Step 3: Integrate SDK

```bash
npm install @credbureau/sdk
```

```typescript
import { CredBureau } from '@credbureau/sdk';
const cb = new CredBureau({ apiKey: 'cb_live_...' });

const score = await cb.score.get({ address: borrowerAddress });

if (score.score >= 700) {
  // Offer 80% collateral ratio instead of 150%
} else if (score.score >= 600) {
  // Offer 120% collateral ratio
} else {
  // Require standard 150% collateral
}
```

### Step 4: Verify On-Chain

For fully on-chain verification without trusting the API, the protocol's smart contract reads the EAS attestation directly:

```solidity
IEAS eas = IEAS(0x4200000000000000000000000000000000000021);
Attestation memory att = eas.getAttestation(attestationUID);
// Decode att.data to get creditScore, riskTier, timestamp
// Check att.expirationTime > block.timestamp
// Check att.revocationTime == 0
```

### Step 5: Monitor

Register webhooks for real-time alerts:

```typescript
const webhook = await cb.webhook.register({
  url: 'https://myprotocol.com/webhook',
  events: ['score_change', 'liquidation', 'attestation_expired']
});
```

---

## Journey 3: Solana User

**Goal:** Get a credit score based on Solana DeFi activity (Kamino, Jupiter, marginfi).

### Step 1: Connect Solana Wallet

1. User clicks the Solana wallet button on the dashboard
2. Selects Phantom, Solflare, or Backpack from the wallet adapter modal
3. Wallet connects (Solana-native flow)

### Step 2: Score Calculation

System detects this is a Solana address (base58 format) and fetches data from:
- **Helius DAS API:** Token balances, tx count, first tx date, NFTs
- **Kamino Finance API:** Borrow/repay positions, health factors
- **marginfi API:** Lending positions
- **Jupiter Price API:** USD conversion for all tokens

The same 300-850 scoring algorithm runs with Solana-calibrated thresholds:
- Transaction frequency thresholds are higher (Solana txs are cheaper)
- DeFi protocols include Kamino, marginfi, Jupiter, Marinade, Raydium, Orca, etc.

### Step 3: Mint Credit Passport on Solana

1. Uses Solana Attestation Service (SAS) for on-chain attestation
2. Transaction costs ~$0.001 on Solana (practically free)
3. Attestation stored on-chain, verifiable by Solana programs

### Step 4: Link EVM Wallet (Optional)

1. User clicks "Link EVM Wallet"
2. Connects MetaMask and signs a linking message
3. Both wallets now contribute to a unified credit score
4. Score improves because more history is aggregated across chains

---

## Technical Flow: End-to-End Scoring Pipeline

```
User Browser                    Next.js API                     External APIs
    |                               |                               |
    |-- Connect wallet ------------>|                               |
    |                               |                               |
    |-- GET /api/v1/score --------->|                               |
    |                               |                               |
    |   (EVM address detected)      |                               |
    |                               |-- GoldRush: getTokenBalances->|
    |                               |-- GoldRush: getTxSummary ---->|
    |                               |-- TheGraph: getAaveData ----->|
    |                               |<---- responses (parallel) ----|
    |                               |                               |
    |   (Solana address detected)   |                               |
    |                               |-- Helius: getAssetsByOwner -->|
    |                               |-- Helius: getSignatures ----->|
    |                               |-- Kamino: getObligations ---->|
    |                               |-- marginfi: getAccounts ----->|
    |                               |<---- responses (parallel) ----|
    |                               |                               |
    |                               |-- Merge into WalletProfile    |
    |                               |                               |
    |                               |-- computeCreditScore()        |
    |                               |   BASE_SCORE:        300      |
    |                               |   walletAge:     0-150 pts    |
    |                               |   txFrequency:   0-100 pts    |
    |                               |   defiDiversity: 0-100 pts    |
    |                               |   repayment:     0-200 pts    |
    |                               |   liquidation:   0 to -150    |
    |                               |   stablecoin:    0-100 pts    |
    |                               |   totalValue:    0-100 pts    |
    |                               |   offChainBonus: 0-100 pts    |
    |                               |   CLAMPED to 300-850          |
    |                               |                               |
    |                               |-- (if ML running)             |
    |                               |   POST /predict to FastAPI    |
    |                               |   Blend: 70% determ + 30% ML  |
    |                               |                               |
    |                               |-- Save to Supabase            |
    |                               |                               |
    |<-- Return CreditScore JSON ---|                               |
    |                               |                               |
    |-- POST /api/v1/attest ------->|                               |
    |                               |-- EAS/SAS: createAttestation  |
    |                               |-- Save attestation to Supabase|
    |<-- Return attestation UID ----|                               |
```
