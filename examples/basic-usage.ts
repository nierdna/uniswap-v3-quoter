/**
 * Basic Usage Example
 * Demonstrates how to use the Uniswap V3 TypeScript Quoter
 */

import { QuoterV3, createPoolState, createTickInfo, getSqrtRatioAtTick } from '../src';

// Example 1: Simple quote with mock pool
function example1_SimpleQuote() {
  console.log('\n=== Example 1: Simple Quote ===');

  // Create quoter instance
  const quoter = new QuoterV3();

  // Create a simple pool state (1:1 price, 0.3% fee)
  const poolState = createPoolState({
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', // Example USDC/WETH pool
    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    fee: 3000, // 0.3%
    tickSpacing: 60,
    sqrtPriceX96: getSqrtRatioAtTick(0), // Price = 1
    tick: 0,
    liquidity: 1000000000000000000n, // 1e18
  });

  // Add some tick data for liquidity range
  poolState.ticks.set(-60, createTickInfo({
    liquidityGross: 1000000000000000000n,
    liquidityNet: 1000000000000000000n,
    initialized: true,
  }));

  poolState.ticks.set(60, createTickInfo({
    liquidityGross: 1000000000000000000n,
    liquidityNet: -1000000000000000000n,
    initialized: true,
  }));

  // Set tick bitmap
  poolState.tickBitmap.set(0, 1n << 1n);
  poolState.tickBitmap.set(-1, 1n << 255n);

  // Quote a swap: 1 USDC -> WETH
  const amountIn = 1000000n; // 1 USDC (6 decimals)
  const amountOut = quoter.quoteExactInputSingle(
    poolState,
    true, // zeroForOne (USDC -> WETH)
    amountIn
  );

  console.log(`Input: ${amountIn} USDC`);
  console.log(`Output: ${amountOut} WETH (raw)`);
  console.log(`Fee deducted: ~${(Number(amountIn) * 0.003).toFixed(0)} USDC`);
}

// Example 2: Quote with custom price
function example2_CustomPrice() {
  console.log('\n=== Example 2: Custom Price ===');

  const quoter = new QuoterV3();

  // Create pool at tick 10000 (higher price)
  const currentTick = 10000;
  const poolState = createPoolState({
    address: '0x1234567890123456789012345678901234567890',
    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fee: 500, // 0.05% fee
    tickSpacing: 10,
    sqrtPriceX96: getSqrtRatioAtTick(currentTick),
    tick: currentTick,
    liquidity: 5000000000000000000n, // 5e18
  });

  const amountIn = 100000000n; // 100 tokens
  const amountOut = quoter.quoteExactInputSingle(poolState, false, amountIn);

  console.log(`Current tick: ${currentTick}`);
  console.log(`Input: ${amountIn}`);
  console.log(`Output: ${amountOut}`);
  console.log(`Effective price: ${Number(amountOut) / Number(amountIn)}`);
}

// Example 3: Quote with price limit
function example3_PriceLimit() {
  console.log('\n=== Example 3: Price Limit ===');

  const quoter = new QuoterV3();

  const poolState = createPoolState({
    address: '0x1234567890123456789012345678901234567890',
    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fee: 3000,
    tickSpacing: 60,
    sqrtPriceX96: getSqrtRatioAtTick(0),
    tick: 0,
    liquidity: 1000000000000000000n,
  });

  const amountIn = 1000000n;
  
  // Set a price limit (stop if price moves too much)
  const priceLimitTick = -1000; // Stop at this tick
  const priceLimit = getSqrtRatioAtTick(priceLimitTick);

  try {
    const amountOut = quoter.quoteExactInputSingle(
      poolState,
      true,
      amountIn,
      priceLimit
    );
    console.log(`Quote with price limit: ${amountOut}`);
  } catch (error) {
    console.log(`Error: ${(error as Error).message}`);
  }
}

// Example 4: Compare different fee tiers
function example4_CompareFees() {
  console.log('\n=== Example 4: Compare Fee Tiers ===');

  const quoter = new QuoterV3();
  const amountIn = 1000000000000000000n; // 1 token

  const feeTiers = [
    { fee: 100, tickSpacing: 1, name: '0.01%' },
    { fee: 500, tickSpacing: 10, name: '0.05%' },
    { fee: 3000, tickSpacing: 60, name: '0.3%' },
    { fee: 10000, tickSpacing: 200, name: '1%' },
  ];

  for (const { fee, tickSpacing, name } of feeTiers) {
    const poolState = createPoolState({
      address: '0x1234567890123456789012345678901234567890',
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      fee,
      tickSpacing,
      sqrtPriceX96: getSqrtRatioAtTick(0),
      tick: 0,
      liquidity: 1000000000000000000n,
    });

    const amountOut = quoter.quoteExactInputSingle(poolState, true, amountIn);
    const feeAmount = amountIn - amountOut;
    
    console.log(`${name} fee: Output = ${amountOut}, Fee = ${feeAmount}`);
  }
}

// Run all examples
function main() {
  console.log('Uniswap V3 TypeScript Quoter - Examples\n');
  
  example1_SimpleQuote();
  example2_CustomPrice();
  example3_PriceLimit();
  example4_CompareFees();

  console.log('\n=== All examples completed ===\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_SimpleQuote,
  example2_CustomPrice,
  example3_PriceLimit,
  example4_CompareFees,
};

