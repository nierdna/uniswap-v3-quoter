/**
 * Example: WebSocket Real-time Updates
 * Demonstrates WebSocket integration for instant pool state updates
 * 
 * Requirements:
 * - BSC_WSS_URL environment variable with WebSocket endpoint
 *   Example: wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY
 */

import { ethers } from 'ethers';
import { QuoterV3, StateFetcher, BSC_ADDRESSES, DEFAULT_RPC_URLS } from '../src';

async function main() {
  console.log('=== Uniswap V3 TypeScript Quoter - WebSocket Example ===\n');

  // Check for WebSocket URL
  const wssUrl = process.env.BSC_WSS_URL;
  if (!wssUrl) {
    console.error('Error: BSC_WSS_URL environment variable not set');
    console.log('\nUsage:');
    console.log('  export BSC_WSS_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY');
    console.log('  npx ts-node examples/with-websocket.ts\n');
    console.log('Available providers:');
    console.log('  - NodeReal: https://nodereal.io/');
    console.log('  - Ankr: https://www.ankr.com/');
    console.log('  - QuickNode: https://www.quicknode.com/\n');
    process.exit(1);
  }

  // Connect to BSC (HTTP for initial state fetch)
  const httpProvider = new ethers.JsonRpcProvider(
    process.env.BSC_RPC_URL || DEFAULT_RPC_URLS.BSC_MAINNET
  );

  console.log(`HTTP Provider: ${DEFAULT_RPC_URLS.BSC_MAINNET}`);
  console.log(`WebSocket URL: ${wssUrl}\n`);

  // Create StateFetcher with WebSocket support
  const stateFetcher = new StateFetcher(
    httpProvider,
    undefined,
    {
      wssUrl,
      reconnectMaxRetries: 0, // infinite retries
      reconnectDelay: 1.0,
      reconnectMaxDelay: 30.0,
    }
  );

  const quoter = new QuoterV3(stateFetcher);

  console.log('Fetching initial pool state...');
  const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
  
  // Fetch initial state (this will also auto-subscribe to WebSocket)
  const poolState = await stateFetcher.fetchPoolState(poolAddress);
  
  console.log('\nInitial Pool State:');
  console.log(`  Pool: ${poolState.address}`);
  console.log(`  Token0: ${poolState.token0}`);
  console.log(`  Token1: ${poolState.token1}`);
  console.log(`  Fee: ${poolState.fee / 10000}%`);
  console.log(`  Current Tick: ${poolState.tick}`);
  console.log(`  Liquidity: ${poolState.liquidity}`);
  console.log(`  Sqrt Price X96: ${poolState.sqrtPriceX96}\n`);

  // Start WebSocket listener
  console.log('Starting WebSocket listener...');
  await stateFetcher.startWebSocket();
  console.log('✓ WebSocket connected and listening for Swap events\n');

  console.log('Waiting for Swap events (this will run indefinitely)...');
  console.log('Quoting every 5 seconds with real-time state:\n');

  // Quote continuously with real-time state
  let quoteCount = 0;
  const quoteInterval = setInterval(async () => {
    try {
      const amountIn = 1000000000000000000n; // 1 WBNB
      
      const startTime = Date.now();
      const amountOut = await quoter.quoteExactInputSingle(
        poolAddress,
        false, // WBNB -> USDT
        amountIn
      );
      const endTime = Date.now();
      const quoteTimeMs = endTime - startTime;

      quoteCount++;
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] Quote #${quoteCount}: ${ethers.formatEther(amountIn)} WBNB -> ${ethers.formatEther(amountOut)} USDT (approx) | quote time: ${quoteTimeMs}ms`
      );
      console.log(`  Current tick: ${poolState.tick}, Liquidity: ${poolState.liquidity}`);
    } catch (error) {
      console.error('Quote error:', error);
    }
  }, 5000);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    clearInterval(quoteInterval);
    await stateFetcher.stopWebSocket();
    console.log('Goodbye!');
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };

