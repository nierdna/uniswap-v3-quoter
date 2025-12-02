/**
 * Example: Using QuoterV3 with StateFetcher for real BSC pool data
 * Demonstrates how to fetch pool state from blockchain and quote swaps
 */

import { ethers } from 'ethers';
import { QuoterV3, StateFetcher, BSC_ADDRESSES, DEFAULT_RPC_URLS } from '../src';

async function main() {
  console.log('=== Uniswap V3 TypeScript Quoter - State Fetcher Example ===\n');

  // Connect to BSC
  const rpcUrl = process.env.BSC_RPC_URL || DEFAULT_RPC_URLS.BSC_MAINNET;
  console.log(`Connecting to BSC: ${rpcUrl}`);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Test connection
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})\n`);
  } catch (error) {
    console.error('Failed to connect to BSC:', error);
    return;
  }

  // Create StateFetcher
  const stateFetcher = new StateFetcher(provider);
  console.log('StateFetcher created\n');

  // Create Quoter with StateFetcher
  const quoter = new QuoterV3(stateFetcher);
  console.log('QuoterV3 created with StateFetcher\n');

  // Example 1: Quote using pool address (auto-fetch state)
  await example1QuoteWithAddress(quoter);

  // Example 2: Quote with manually fetched state
  await example2QuoteWithManualFetch(quoter, stateFetcher);

  // Example 3: Multiple quotes with cached state
  await example3CachedQuotes(quoter, stateFetcher);

  console.log('\n=== All examples completed ===');
}

/**
 * Example 1: Quote using pool address (auto-fetch)
 */
async function example1QuoteWithAddress(quoter: QuoterV3) {
  console.log('--- Example 1: Quote with Pool Address ---');

  const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
  console.log(`Pool: USDT/WBNB 0.05% (${poolAddress})`);

  const amountIn = 1000000000000000000n; // 1 WBNB (18 decimals)

  try {
    // Quote using pool address - StateFetcher automatically fetches state
    const amountOut = await quoter.quoteExactInputSingle(
      poolAddress,
      false, // WBNB -> USDT (token1 -> token0)
      amountIn
    );

    console.log(`Quote: ${ethers.formatEther(amountIn)} WBNB -> ${ethers.formatUnits(amountOut, 18)} USDT`);
    console.log(`(Note: USDT might have different decimals, this is just for display)\n`);
  } catch (error) {
    console.error('Quote failed:', error);
    console.log('This might be due to RPC issues or pool state. Continuing...\n');
  }
}

/**
 * Example 2: Quote with manually fetched state
 */
async function example2QuoteWithManualFetch(quoter: QuoterV3, stateFetcher: StateFetcher) {
  console.log('--- Example 2: Manual State Fetch ---');

  const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;

  try {
    // Manually fetch pool state
    console.log('Fetching pool state...');
    const poolState = await stateFetcher.fetchPoolState(poolAddress);

    console.log(`Pool State:`);
    console.log(`  Token0: ${poolState.token0}`);
    console.log(`  Token1: ${poolState.token1}`);
    console.log(`  Fee: ${poolState.fee / 10000}%`);
    console.log(`  Current Tick: ${poolState.tick}`);
    console.log(`  Liquidity: ${poolState.liquidity}`);
    console.log(`  Sqrt Price X96: ${poolState.sqrtPriceX96}\n`);

    // Quote using the fetched pool state (sync)
    const amountIn = 1000000n; // Small amount for testing
    const amountOut = quoter.quoteExactInputSingle(
      poolState,
      true, // USDT -> WBNB (token0 -> token1)
      amountIn
    );

    console.log(`Quote: ${amountIn} -> ${amountOut}\n`);
  } catch (error) {
    console.error('Failed:', error);
    console.log('Continuing...\n');
  }
}

/**
 * Example 3: Multiple quotes with cached state
 */
async function example3CachedQuotes(quoter: QuoterV3, stateFetcher: StateFetcher) {
  console.log('--- Example 3: Cached State Performance ---');

  const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;

  try {
    // First fetch - fetches from blockchain
    console.log('First fetch (from blockchain)...');
    const start1 = Date.now();
    await stateFetcher.fetchPoolState(poolAddress);
    const time1 = Date.now() - start1;
    console.log(`Time: ${time1}ms\n`);

    // Subsequent quotes use cached state
    console.log('Quoting with cached state (should be fast)...');
    const amounts = [100000n, 500000n, 1000000n, 5000000n];

    for (const amountIn of amounts) {
      const start = Date.now();
      const amountOut = await quoter.quoteExactInputSingle(
        poolAddress,
        true,
        amountIn
      );
      const time = Date.now() - start;

      console.log(`  ${amountIn} -> ${amountOut} (${time}ms)`);
    }

    console.log(`\nCache size: ${stateFetcher.getCacheSize()} pools`);
    console.log(`Cached pools: ${stateFetcher.getCachedPoolAddresses().join(', ')}\n`);
  } catch (error) {
    console.error('Failed:', error);
    console.log('Continuing...\n');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };

