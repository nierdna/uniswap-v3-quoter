# Getting Started - Uniswap V3 TypeScript Quoter

## Overview

This library provides 3 modes of operation:

1. **Phase 1**: Local quotes with manual state (no network)
2. **Phase 2**: Auto-fetch state from BSC (requires RPC)
3. **Phase 3**: Real-time updates via WebSocket (requires WSS)

Choose the mode that fits your needs!

---

## Installation

```bash
cd /Users/andrein/v3/v3-ts-quoter
npm install
npm run build
```

---

## Mode 1: Local Quotes (No Network Required)

### Use Case
- Testing
- Unit tests
- Fast iteration
- No API keys needed

### Example

```typescript
import { QuoterV3, createPoolState, getSqrtRatioAtTick } from './src';

const quoter = new QuoterV3();

const poolState = createPoolState({
  address: '0x...',
  token0: '0x...',
  token1: '0x...',
  fee: 3000,
  tickSpacing: 60,
  sqrtPriceX96: getSqrtRatioAtTick(0),
  tick: 0,
  liquidity: 1000000000000000000n,
});

const amountOut = quoter.quoteExactInputSingle(
  poolState,
  true,
  1000000n
);
```

### Run Example

```bash
npx ts-node examples/basic-usage.ts
```

---

## Mode 2: Auto-Fetch from BSC (Requires RPC)

### Use Case
- Production bots
- Price monitoring
- Non-critical quotes (~100ms latency OK)

### Setup

```bash
# Optional: Use custom RPC
export BSC_RPC_URL=https://your-bsc-node.com
```

### Example

```typescript
import { ethers } from 'ethers';
import { QuoterV3, StateFetcher } from './src';

const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const stateFetcher = new StateFetcher(provider);
const quoter = new QuoterV3(stateFetcher);

// Quote using pool address (auto-fetches state)
const amountOut = await quoter.quoteExactInputSingle(
  '0x36696169C63e42cd08ce11f5deeBbCeBae652050',
  false,
  1000000000000000000n
);
```

### Run Example

```bash
npx ts-node examples/with-state-fetcher.ts
```

### Performance
- Initial fetch: ~100-200ms (Multicall3)
- Quote (cached): <1ms
- RPC calls: 8 → 1 (batched)

---

## Mode 3: Real-time WebSocket (Requires WSS)

### Use Case
- HFT (High-Frequency Trading)
- Arbitrage bots
- Critical applications (<10ms latency required)

### Setup

**REQUIRED**: Get WebSocket API key from providers:
- **NodeReal**: https://nodereal.io/ (Recommended)
- **Ankr**: https://www.ankr.com/
- **QuickNode**: https://www.quicknode.com/

```bash
# Required for WebSocket
export BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# Optional: Custom RPC for initial fetch
export BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

### Example

```typescript
import { ethers } from 'ethers';
import { QuoterV3, StateFetcher } from './src';

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);

const stateFetcher = new StateFetcher(
  provider,
  undefined,
  {
    wssUrl: process.env.BSC_WSS_URL,
    reconnectMaxRetries: 0, // infinite retries
  }
);

const quoter = new QuoterV3(stateFetcher);

// Fetch pool (auto-subscribes to WebSocket)
await stateFetcher.fetchPoolState('0x36696169C63e42cd08ce11f5deeBbCeBae652050');

// Start WebSocket listener
await stateFetcher.startWebSocket();

console.log('Listening for Swap events...');

// Quote with real-time state
setInterval(async () => {
  const amountOut = await quoter.quoteExactInputSingle(
    '0x36696169C63e42cd08ce11f5deeBbCeBae652050',
    false,
    1000000000000000000n
  );
  console.log(`Current quote: ${amountOut}`);
}, 5000);
```

### Run Example

```bash
export BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_KEY
npx ts-node examples/with-websocket.ts
```

### Performance
- Event latency: <10ms
- State freshness: Real-time
- RPC usage: Minimal
- Best for: HFT

---

## Comparison Table

| Feature | Mode 1 (Local) | Mode 2 (RPC) | Mode 3 (WebSocket) |
|---------|----------------|--------------|---------------------|
| **Network required** | ❌ | ✅ | ✅ |
| **API keys** | ❌ | ❌ | ✅ Required |
| **Latency** | <1ms | ~100ms | <10ms |
| **State freshness** | Manual | On-demand | Real-time |
| **RPC usage** | None | Medium | Minimal |
| **Cost** | Free | Free | Paid (WSS) |
| **Best for** | Testing | Monitoring | HFT |

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Integration Tests (Phase 2)

```bash
RUN_INTEGRATION_TESTS=true npm test
```

### Run WebSocket Tests (Phase 3)

```bash
export BSC_WSS_URL=wss://...
RUN_WS_TESTS=true npm test
```

---

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Test Failures

```bash
# Run specific test file
npm test -- math.test.ts

# Run with verbose output
npm test -- --verbose
```

### WebSocket Issues

**Connection fails**:
- Check BSC_WSS_URL is set correctly
- Verify API key is valid
- Try different WSS provider

**No events received**:
- Pool might be inactive (low volume)
- Try popular pool: USDT/WBNB
- Check if pool address is correct

**Frequent disconnects**:
- Use paid tier WSS endpoint
- Check network stability
- Increase reconnectMaxDelay

---

## Documentation

- `README.md` - Main documentation
- `QUICKSTART.md` - Quick start guide
- `PROJECT_SUMMARY.md` - Complete project overview
- `IMPLEMENTATION_SUMMARY.md` - Phase 1 details
- `PHASE2_SUMMARY.md` - Phase 2 details
- `PHASE3_SUMMARY.md` - Phase 3 details
- `GETTING_STARTED.md` - This file

---

## Support

For questions or issues:
1. Check documentation in this repo
2. Review examples in `examples/` folder
3. Read inline code comments
4. Check test files for usage patterns

---

## Next Steps

1. **Try examples** - Start with basic-usage.ts
2. **Run tests** - Verify everything works
3. **Choose your mode** - Local, RPC, or WebSocket
4. **Integrate** - Use in your project
5. **Deploy** - Production deployment

---

Good luck with your trading bot! 🚀

