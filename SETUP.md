# CredBureau Setup and Deployment Guide

Complete instructions for running CredBureau locally, deploying to mainnet, and maintaining a production instance.

---

## Prerequisites

### Required Tools

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.18.3+ | [nodejs.org](https://nodejs.org/) |
| Yarn | 3.x (included) | `corepack enable` |
| Python | 3.10+ (for ML) | [python.org](https://python.org/) |
| Foundry | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

### Required Accounts

| Service | Purpose | Signup URL |
|---------|---------|------------|
| Supabase | PostgreSQL database | [supabase.com](https://supabase.com) |
| GoldRush / Covalent | EVM on-chain data | [goldrush.dev](https://goldrush.dev) |
| Helius | Solana on-chain data | [helius.dev](https://helius.dev) |
| Vercel | Frontend deployment | [vercel.com](https://vercel.com) |
| BaseScan | Contract verification | [basescan.org](https://basescan.org) |
| Arbiscan | Contract verification | [arbiscan.io](https://arbiscan.io) |

### Optional Accounts

| Service | Purpose | Signup URL |
|---------|---------|------------|
| Cred Protocol | EVM baseline scores | [app.credprotocol.com](https://app.credprotocol.com) |
| Reclaim Protocol | Off-chain zkTLS data | [dev.reclaimprotocol.org](https://dev.reclaimprotocol.org) |
| Coinbase CDP | Base gas sponsorship | [cdp.coinbase.com](https://cdp.coinbase.com) |

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/credit-bureau.git
cd credit-bureau
yarn install
```

### 2. Environment Variables

```bash
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

Edit `packages/nextjs/.env.local` and fill in the required variables. See the [Environment Variables Reference](#environment-variables-reference) below for details on each variable.

### 3. Database Setup

Go to your Supabase project dashboard > SQL Editor and run the migrations in order:

```bash
# Migration 1: Core schema
# Paste contents of: supabase/migrations/001_initial_schema.sql

# Migration 2: Anonymous scoring support
# Paste contents of: supabase/migrations/002_allow_anonymous_scores.sql

# Migration 3: Solana support
# Paste contents of: supabase/migrations/003_add_solana_support.sql
```

### 4. Start Development

Open three terminal windows:

```bash
# Terminal 1: Start local blockchain
yarn chain

# Terminal 2: Deploy contracts locally
yarn deploy

# Terminal 3: Start the frontend
yarn start
# App runs at http://localhost:3000
```

### 5. Start ML Service (Optional)

```bash
cd ml-service
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python train.py
uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables Reference

### Network Mode

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_NETWORK_MODE` | Yes | `testnet` | `testnet` or `mainnet`. Controls which chains the app targets. |

### Supabase

| Variable | Required | Where to Get | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase > Settings > API | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same page | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same page (service role) | `eyJhbGci...` |

### On-Chain Data

| Variable | Required | Where to Get | Example |
|----------|----------|-------------|---------|
| `GOLDRUSH_API_KEY` | Yes | goldrush.dev > Dashboard | `cqt_xxxx` |
| `HELIUS_API_KEY` | For Solana | helius.dev > Dashboard | `xxxx-xxxx` |

### Attestation

| Variable | Required | Description |
|----------|----------|-------------|
| `EAS_ATTESTER_PRIVATE_KEY` | Yes | Private key of the EVM wallet that signs attestations. Use a dedicated hot wallet with minimal funds. |
| `SOLANA_ATTESTER_PRIVATE_KEY` | For Solana | Solana keypair (base58 or JSON array). Falls back to `EAS_ATTESTER_PRIVATE_KEY`. |
| `SAS_PROGRAM_ID` | No | SAS program ID. Default: `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG` |

### Mainnet RPCs

| Variable | Required | Default Fallback |
|----------|----------|-----------------|
| `BASE_MAINNET_RPC_URL` | For mainnet | `https://mainnet.base.org` |
| `ARBITRUM_MAINNET_RPC_URL` | For mainnet | `https://arb1.arbitrum.io/rpc` |
| `OPTIMISM_MAINNET_RPC_URL` | For mainnet | `https://mainnet.optimism.io` |
| `ETHEREUM_MAINNET_RPC_URL` | No | `https://eth.llamarpc.com` |

### Block Explorer API Keys

| Variable | Required | Where to Get |
|----------|----------|-------------|
| `BASESCAN_API_KEY` | For verification | basescan.org > API Keys |
| `ARBISCAN_API_KEY` | For verification | arbiscan.io > API Keys |
| `OPTIMISTIC_ETHERSCAN_API_KEY` | For verification | etherscan.io > API Keys |

### Gas Sponsorship

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CDP_PAYMASTER_URL` | No | Coinbase CDP paymaster URL for gasless txs on Base |

### Optional Services

| Variable | Required | Description |
|----------|----------|-------------|
| `CRED_PROTOCOL_API_KEY` | No | Cred Protocol baseline scores |
| `RECLAIM_APP_ID` | No | Reclaim Protocol app ID |
| `RECLAIM_APP_SECRET` | No | Reclaim Protocol app secret |
| `ML_SERVICE_URL` | No | Python ML service URL (default: `http://localhost:8000`) |

---

## Mainnet Deployment

### Step 1: Fund Your Deployer Wallet

You need a small amount of ETH on each target chain:
- **Base:** ~0.005 ETH (~$15)
- **Arbitrum:** ~0.005 ETH (~$15)
- **Optimism:** ~0.005 ETH (~$15)

Cheapest method: Buy ETH on Coinbase, withdraw directly to Base (avoids L1 gas).

### Step 2: Deploy Smart Contracts

```bash
cd packages/foundry

# Deploy to Base mainnet
forge script script/DeployMainnet.s.sol --rpc-url base --broadcast --verify

# Deploy to Arbitrum mainnet
forge script script/DeployMainnet.s.sol --rpc-url arbitrum --broadcast --verify

# Deploy to Optimism mainnet
forge script script/DeployMainnet.s.sol --rpc-url optimism --broadcast --verify
```

To use a separate attester address:
```bash
ATTESTER_ADDRESS=0x... forge script script/DeployMainnet.s.sol --rpc-url base --broadcast --verify
```

### Step 3: Update Deployed Contracts

After deployment, copy the contract addresses from the deploy output into:
`packages/nextjs/contracts/deployedContracts.ts`

The deploy script auto-exports to `packages/foundry/deployments/<chainId>.json`.

### Step 4: Switch to Mainnet Mode

```bash
# In packages/nextjs/.env.local:
NEXT_PUBLIC_NETWORK_MODE=mainnet
```

### Step 5: Deploy Frontend

```bash
yarn vercel --prod
```

Or with the quick deploy:
```bash
yarn vercel:yolo --prod
```

### Step 6: Register EAS Schema

The schema auto-registers on first attestation per chain. To pre-register (saves gas on the first user):

1. Visit [base.easscan.org](https://base.easscan.org) > Register Schema
2. Schema: `uint16 creditScore, uint8 riskTier, uint256 timestamp, address wallet, bytes32 dataHash, bool hasOffChainData, uint8 modelVersion`
3. Resolver: `0x0000000000000000000000000000000000000000`
4. Revocable: Yes
5. Repeat for Arbitrum and Optimism EASScan

---

## Testing Checklist

### Test 1: EVM Mainnet Scoring

1. Open the deployed URL
2. Connect MetaMask on Base mainnet
3. Dashboard should load and display your score
4. Verify in Supabase: `credit_scores` table has a new row with `chain_type = 'evm'`
5. Test the API: `curl "https://your-app.vercel.app/api/v1/score?address=YOUR_ADDRESS"`

### Test 2: Mainnet Attestation

1. On dashboard, click "Mint Credit Passport"
2. Select "Base" as chain
3. If paymaster configured: transaction should be gasless
4. After confirmation, attestation appears in history
5. Click EASScan link to verify

### Test 3: Solana Wallet Connection

1. Click the Solana wallet button
2. Connect Phantom wallet
3. Dashboard should show Solana-specific data
4. Score should compute based on Solana DeFi history

### Test 4: Cross-Chain Linking

1. Connect EVM wallet (MetaMask)
2. Click "Link Solana Wallet"
3. Connect Phantom
4. Sign the linking message
5. Verify in Supabase: `linked_wallets` has both entries

### Test 5: API Verification

```bash
# Health check
curl https://your-app.vercel.app/api/v1/health

# Score an EVM wallet
curl "https://your-app.vercel.app/api/v1/score?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&chains=base-mainnet"

# Score a Solana wallet
curl "https://your-app.vercel.app/api/v1/score?address=YOUR_SOLANA_ADDRESS&chains=solana-mainnet"

# Verify an attestation
curl "https://your-app.vercel.app/api/v1/verify?attestationUID=0x...&chain=base"
```

---

## Ongoing Maintenance

### Attestation Expiry
- EAS attestations expire after 30 days
- Users need to return to refresh their score and re-mint

### API Monitoring
- Monitor Supabase usage (free tier: 500MB database, 50K MAU)
- Monitor GoldRush API usage (free tier has rate limits)
- Monitor Helius API usage (free tier: 100K credits/day)
- Check Vercel deployment logs for API errors

### ML Model Retraining
```bash
cd ml-service
python export_training_data.py --output data/real_data.csv
python train.py --csv data/real_data.csv
```

### Database Cleanup
```sql
-- Remove expired attestations older than 90 days
DELETE FROM attestations WHERE expires_at < NOW() - INTERVAL '90 days';

-- Remove old score records older than 1 year
DELETE FROM credit_scores WHERE created_at < NOW() - INTERVAL '1 year';
```
