# Quick Start Guide

## Installation

```bash
cd v3-ts-quoter
npm install
```

## Build

```bash
npm run build
```

## Run Tests

```bash
npm test
```

Output:
```
PASS test/math.test.ts
PASS test/quoter.test.ts

Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
Time:        ~1s
```

## Run Examples

```bash
npx ts-node examples/basic-usage.ts
```

## Basic Usage

### 1. Import

```typescript
import { QuoterV3, createPoolState, getSqrtRatioAtTick } from './src';
```

### 2. Create Quoter

```typescript
const quoter = new QuoterV3();
```

### 3. Create Pool State

```typescript
const poolState = createPoolState({
  address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
  token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  fee: 3000,        // 0.3%
  tickSpacing: 60,
  sqrtPriceX96: getSqrtRatioAtTick(0),
  tick: 0,
  liquidity: 1000000000000000000n,
});
```

### 4. Quote a Swap

```typescript
const amountIn = 1000000n; // 1 USDC
const amountOut = quoter.quoteExactInputSingle(
  poolState,
  true,  // zeroForOne (USDC -> WETH)
  amountIn
);

console.log(`${amountIn} USDC -> ${amountOut} WETH`);
```

## Key Concepts

### BigInt for Amounts

All amounts use JavaScript `BigInt`:

```typescript
const amount = 1000000000000000000n; // 1 token (18 decimals)
```

### Zero For One

- `true`: Swap token0 → token1
- `false`: Swap token1 → token0

### Fee Tiers

| Fee | Tick Spacing | Use Case |
|-----|--------------|----------|
| 100 (0.01%) | 1 | Stablecoins |
| 500 (0.05%) | 10 | Correlated assets |
| 3000 (0.3%) | 60 | Most pairs |
| 10000 (1%) | 200 | Exotic pairs |

### Price at Tick

```typescript
import { getSqrtRatioAtTick } from './src';

const sqrtPriceX96 = getSqrtRatioAtTick(0); // Price = 1
```

## Next Steps

1. **Read README.md** - Full documentation
2. **Check examples/** - More usage examples
3. **Run tests** - See how everything works
4. **Read IMPLEMENTATION_SUMMARY.md** - Technical details

## Project Stats

- **Total TypeScript files**: 14
- **Total lines of code**: ~1,492
- **Test files**: 3
- **Tests**: 24 (all passing)
- **Build time**: < 2 seconds
- **Test time**: ~1 second

## Folder Structure

```
v3-ts-quoter/
├── src/          # Source code
├── test/         # Tests
├── examples/     # Usage examples
├── dist/         # Compiled output
└── docs/         # Documentation
```

## Common Issues

### TypeScript not found

```bash
npm install -g typescript
```

### Tests fail

Make sure you've built first:
```bash
npm run build
npm test
```

### Import errors

Use the compiled version:
```typescript
import { QuoterV3 } from './dist';
```

## Help

- Check README.md for detailed documentation
- See test/ folder for more examples
- Read source code comments for details

---

Happy coding! 🚀

