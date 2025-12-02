/**
 * Mock Pool State for Testing
 * Simple pool state with basic liquidity for testing quote calculations
 */

import { createPoolState, createTickInfo, type PoolState } from '../src/types';
import { getSqrtRatioAtTick } from '../src/math';

/**
 * Creates a simple mock pool state with liquidity around tick 0
 * This represents a pool with approximately 1:1 price ratio
 */
export function createMockPoolState(): PoolState {
  const tickSpacing = 60;
  const fee = 3000; // 0.3%

  // Create pool at approximately 1:1 price (tick 0)
  const currentTick = 0;
  const sqrtPriceX96 = getSqrtRatioAtTick(currentTick);

  // Create tick data with liquidity
  const ticks = new Map();
  const tickBitmap = new Map();

  // Add liquidity around current price
  // Lower tick at -tickSpacing
  ticks.set(-tickSpacing, createTickInfo({
    liquidityGross: 1000000000000000000n, // 1e18
    liquidityNet: 1000000000000000000n,   // positive when crossing from left
    initialized: true,
  }));

  // Upper tick at +tickSpacing
  ticks.set(tickSpacing, createTickInfo({
    liquidityGross: 1000000000000000000n,
    liquidityNet: -1000000000000000000n,  // negative when crossing from left
    initialized: true,
  }));

  // Set tick bitmap
  // For tick -60: compressed = -1, wordPos = -1 >> 8 = -1, bitPos = -1 & 0xFF = 255
  // For tick 60: compressed = 1, wordPos = 1 >> 8 = 0, bitPos = 1 & 0xFF = 1
  tickBitmap.set(0, 1n << 1n); // Tick 60 is at bit position 1
  tickBitmap.set(-1, 1n << 255n); // Tick -60 is at bit position 255 of word -1

  const poolState = createPoolState({
    address: '0x1234567890123456789012345678901234567890',
    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mock USDC
    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Mock WETH
    fee,
    tickSpacing,
    sqrtPriceX96,
    tick: currentTick,
    liquidity: 1000000000000000000n, // 1e18 - current liquidity
    ticks,
    tickBitmap,
  });

  return poolState;
}

/**
 * Creates a mock pool state with custom parameters
 */
export function createCustomMockPoolState(params: {
  currentTick?: number;
  liquidity?: bigint;
  fee?: number;
  tickSpacing?: number;
}): PoolState {
  const {
    currentTick = 0,
    liquidity = 1000000000000000000n,
    fee = 3000,
    tickSpacing = 60,
  } = params;

  const sqrtPriceX96 = getSqrtRatioAtTick(currentTick);

  const poolState = createPoolState({
    address: '0x1234567890123456789012345678901234567890',
    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fee,
    tickSpacing,
    sqrtPriceX96,
    tick: currentTick,
    liquidity,
    ticks: new Map(),
    tickBitmap: new Map(),
  });

  return poolState;
}

