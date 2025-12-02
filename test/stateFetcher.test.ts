/**
 * StateFetcher Integration Tests
 * Tests with real BSC blockchain data
 * 
 * Note: These tests require network access and may be slow
 * Set BSC_RPC_URL environment variable to use a custom RPC endpoint
 */

import { ethers } from 'ethers';
import { StateFetcher, QuoterV3, BSC_ADDRESSES, DEFAULT_RPC_URLS } from '../src';

// Skip these tests by default in CI environments
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true' || process.env.BSC_RPC_URL;

describe('StateFetcher - BSC Integration', () => {
  let provider: ethers.Provider;
  let stateFetcher: StateFetcher;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to run.');
      return;
    }

    const rpcUrl = process.env.BSC_RPC_URL || DEFAULT_RPC_URLS.BSC_MAINNET;
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Test connection
    try {
      await provider.getNetwork();
    } catch (error) {
      console.error('Failed to connect to BSC. Skipping integration tests.', error);
      return;
    }

    stateFetcher = new StateFetcher(provider);
  }, 30000); // 30s timeout for setup

  describe('fetchPoolState', () => {
    it('should fetch real pool state from BSC', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      const poolState = await stateFetcher.fetchPoolState(poolAddress);

      // Verify pool state structure
      expect(poolState.address).toBe(poolAddress.toLowerCase());
      expect(poolState.token0).toBeTruthy();
      expect(poolState.token1).toBeTruthy();
      expect(poolState.fee).toBeGreaterThan(0);
      expect(poolState.tickSpacing).toBeGreaterThan(0);
      expect(poolState.sqrtPriceX96).toBeGreaterThan(0n);
      expect(poolState.liquidity).toBeGreaterThan(0n);
      
      console.log('Pool State:', {
        address: poolState.address,
        token0: poolState.token0,
        token1: poolState.token1,
        fee: poolState.fee,
        tick: poolState.tick,
        liquidity: poolState.liquidity.toString(),
      });
    }, 30000);

    it('should cache fetched pool state', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      
      // Fetch once
      await stateFetcher.fetchPoolState(poolAddress);
      
      // Should be in cache
      const cachedState = stateFetcher.getPoolState(poolAddress);
      expect(cachedState).toBeDefined();
      expect(cachedState!.address).toBe(poolAddress.toLowerCase());
    }, 30000);

    it('should return consistent results on multiple fetches', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      
      const state1 = await stateFetcher.fetchPoolState(poolAddress);
      const state2 = await stateFetcher.fetchPoolState(poolAddress);
      
      // Same pool should have same immutable data
      expect(state1.token0).toBe(state2.token0);
      expect(state1.token1).toBe(state2.token1);
      expect(state1.fee).toBe(state2.fee);
      expect(state1.tickSpacing).toBe(state2.tickSpacing);
    }, 30000);
  });

  describe('updatePoolState', () => {
    it('should update existing pool state', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      
      // Fetch initial state
      const state1 = await stateFetcher.fetchPoolState(poolAddress);
      const block1 = state1.lastUpdateBlock;
      
      // Wait a bit for potential block change
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update state
      const state2 = await stateFetcher.updatePoolState(poolAddress);
      const block2 = state2.lastUpdateBlock;
      
      // Block should be same or newer
      expect(block2).toBeGreaterThanOrEqual(block1!);
    }, 30000);
  });

  describe('QuoterV3 Integration', () => {
    it('should quote with fetched state', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const quoter = new QuoterV3(stateFetcher);
      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      
      const amountIn = 1000000n; // Small amount for testing
      
      // Quote using pool address (auto-fetch)
      const amountOut = await quoter.quoteExactInputSingle(
        poolAddress,
        true,
        amountIn
      );
      
      expect(amountOut).toBeGreaterThan(0n);
      console.log(`Quote result: ${amountIn} -> ${amountOut}`);
    }, 30000);

    it('should quote without StateFetcher using PoolState', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      const poolState = await stateFetcher.fetchPoolState(poolAddress);
      
      // Create quoter without StateFetcher
      const quoter = new QuoterV3();
      
      const amountIn = 1000000n;
      
      // Quote using PoolState (sync)
      const amountOut = quoter.quoteExactInputSingle(
        poolState,
        true,
        amountIn
      );
      
      expect(amountOut).toBeGreaterThan(0n);
    }, 30000);

    it('should throw error when quoting with address but no StateFetcher', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const quoter = new QuoterV3(); // No StateFetcher
      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      
      await expect(
        quoter.quoteExactInputSingle(poolAddress, true, 1000000n)
      ).rejects.toThrow('StateFetcher required');
    });
  });

  describe('Cache Management', () => {
    it('should track cache size', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const newFetcher = new StateFetcher(provider);
      
      expect(newFetcher.getCacheSize()).toBe(0);
      
      await newFetcher.fetchPoolState(BSC_ADDRESSES.USDT_WBNB_500);
      expect(newFetcher.getCacheSize()).toBe(1);
      
      newFetcher.clearAll();
      expect(newFetcher.getCacheSize()).toBe(0);
    }, 30000);

    it('should list cached pool addresses', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }

      const newFetcher = new StateFetcher(provider);
      
      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      await newFetcher.fetchPoolState(poolAddress);
      
      const cached = newFetcher.getCachedPoolAddresses();
      expect(cached).toHaveLength(1);
      expect(cached[0]).toBe(poolAddress.toLowerCase());
    }, 30000);
  });
});

