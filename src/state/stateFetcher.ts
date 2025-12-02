/**
 * State Fetcher
 * Fetches pool state from BSC using ethers.js and Multicall3
 * Ported from Python implementation
 */

import { ethers } from 'ethers';
import type { PoolState } from '../types';
import { createPoolState } from '../types';
import { POOL_ABI, MULTICALL3_ABI } from '../constants/abis';
import { getMulticall3Address } from '../constants/addresses';
import { decodeSlot0Manual, int24ToSigned } from '../utils/encoding';

/**
 * StateFetcher class for fetching and caching pool states from blockchain
 */
export class StateFetcher {
  private provider: ethers.Provider;
  private multicall: ethers.Contract;
  private poolCache: Map<string, PoolState>;

  /**
   * Initialize StateFetcher
   *
   * @param provider Ethers.js provider connected to BSC
   * @param multicallAddress Address of Multicall3 contract (defaults to BSC Multicall3)
   */
  constructor(provider: ethers.Provider, multicallAddress?: string) {
    this.provider = provider;
    this.poolCache = new Map();

    const multicallAddr = multicallAddress || getMulticall3Address();
    this.multicall = new ethers.Contract(multicallAddr, MULTICALL3_ABI, this.provider);
  }

  /**
   * Fetch complete pool state from blockchain using Multicall3
   *
   * @param poolAddress Address of the Uniswap V3 / PancakeSwap V3 pool
   * @returns PoolState object with current pool state
   */
  async fetchPoolState(poolAddress: string): Promise<PoolState> {
    const checksumAddress = ethers.getAddress(poolAddress);

    // Create pool contract interface for encoding
    const poolInterface = new ethers.Interface(POOL_ABI);

    // Prepare multicall batch for basic pool data
    const calls: { target: string; callData: string }[] = [
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('slot0'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('liquidity'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('fee'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('tickSpacing'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('token0'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('token1'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('feeGrowthGlobal0X128'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('feeGrowthGlobal1X128'),
      },
    ];

    // Execute multicall (use staticCall for read-only operation)
    const [blockNumber, returnData] = await this.multicall.aggregate.staticCall(calls);

    // Decode results
    // Use manual decoding for slot0 to avoid padding issues with PancakeSwap V3
    const slot0Data = decodeSlot0Manual(returnData[0]);

    const liquidity = poolInterface.decodeFunctionResult('liquidity', returnData[1])[0];
    const fee = poolInterface.decodeFunctionResult('fee', returnData[2])[0];
    const tickSpacingRaw = poolInterface.decodeFunctionResult('tickSpacing', returnData[3])[0];
    const token0 = poolInterface.decodeFunctionResult('token0', returnData[4])[0];
    const token1 = poolInterface.decodeFunctionResult('token1', returnData[5])[0];
    const feeGrowthGlobal0X128 = poolInterface.decodeFunctionResult(
      'feeGrowthGlobal0X128',
      returnData[6]
    )[0];
    const feeGrowthGlobal1X128 = poolInterface.decodeFunctionResult(
      'feeGrowthGlobal1X128',
      returnData[7]
    )[0];

    // Convert tickSpacing from uint to signed int24
    const tickSpacing = int24ToSigned(tickSpacingRaw);

    // Create pool state
    const poolState = createPoolState({
      address: checksumAddress.toLowerCase(),
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
      fee: Number(fee),
      tickSpacing,
      sqrtPriceX96: slot0Data.sqrtPriceX96,
      tick: slot0Data.tick,
      observationIndex: slot0Data.observationIndex,
      observationCardinality: slot0Data.observationCardinality,
      observationCardinalityNext: slot0Data.observationCardinalityNext,
      feeProtocol: slot0Data.feeProtocol,
      unlocked: slot0Data.unlocked,
      liquidity: liquidity,
      feeGrowthGlobal0X128: feeGrowthGlobal0X128,
      feeGrowthGlobal1X128: feeGrowthGlobal1X128,
      lastUpdateBlock: Number(blockNumber),
      lastUpdateTimestamp: Date.now() / 1000,
    });

    // Cache the pool state
    this.poolCache.set(checksumAddress.toLowerCase(), poolState);

    return poolState;
  }

  /**
   * Update existing pool state with latest data
   *
   * @param poolAddress Address of the pool to update
   * @returns Updated PoolState
   */
  async updatePoolState(poolAddress: string): Promise<PoolState> {
    const checksumAddress = ethers.getAddress(poolAddress);

    // If pool not in cache, fetch full state
    const cachedState = this.poolCache.get(checksumAddress.toLowerCase());
    if (!cachedState) {
      return this.fetchPoolState(poolAddress);
    }

    // Create pool contract interface
    const poolInterface = new ethers.Interface(POOL_ABI);

    // Prepare multicall for quick update (slot0 + liquidity)
    const calls: { target: string; callData: string }[] = [
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('slot0'),
      },
      {
        target: checksumAddress,
        callData: poolInterface.encodeFunctionData('liquidity'),
      },
    ];

    // Execute multicall (use staticCall for read-only operation)
    const startTime = Date.now();
    const [blockNumber, returnData] = await this.multicall.aggregate.staticCall(calls);
    const elapsedTime = Date.now() - startTime;
    console.log(`[updatePoolState] Multicall took ${elapsedTime}ms`);

    // Decode results
    const slot0Data = decodeSlot0Manual(returnData[0]);
    const liquidity = poolInterface.decodeFunctionResult('liquidity', returnData[1])[0];

    // Update pool state
    cachedState.sqrtPriceX96 = slot0Data.sqrtPriceX96;
    cachedState.tick = slot0Data.tick;
    cachedState.observationIndex = slot0Data.observationIndex;
    cachedState.observationCardinality = slot0Data.observationCardinality;
    cachedState.observationCardinalityNext = slot0Data.observationCardinalityNext;
    cachedState.feeProtocol = slot0Data.feeProtocol;
    cachedState.unlocked = slot0Data.unlocked;
    cachedState.liquidity = liquidity;
    cachedState.lastUpdateBlock = Number(blockNumber);
    cachedState.lastUpdateTimestamp = Date.now() / 1000;

    return cachedState;
  }

  /**
   * Get cached pool state
   *
   * @param poolAddress Address of the pool
   * @returns PoolState if cached, undefined otherwise
   */
  getPoolState(poolAddress: string): PoolState | undefined {
    const checksumAddress = ethers.getAddress(poolAddress);
    return this.poolCache.get(checksumAddress.toLowerCase());
  }

  /**
   * Clear pool from cache
   *
   * @param poolAddress Address of the pool to remove from cache
   */
  clearPool(poolAddress: string): void {
    const checksumAddress = ethers.getAddress(poolAddress);
    this.poolCache.delete(checksumAddress.toLowerCase());
  }

  /**
   * Clear all cached pools
   */
  clearAll(): void {
    this.poolCache.clear();
  }

  /**
   * Get number of cached pools
   */
  getCacheSize(): number {
    return this.poolCache.size;
  }

  /**
   * Get all cached pool addresses
   */
  getCachedPoolAddresses(): string[] {
    return Array.from(this.poolCache.keys());
  }
}

