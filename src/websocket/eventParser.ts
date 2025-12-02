/**
 * Event Parser
 * Parses Swap events from PancakeSwap V3 / Uniswap V3 pools
 * Ported from Python implementation
 */

import { ethers } from 'ethers';
import { int24ToSigned } from '../utils';
import type { SwapEventData } from './types';

/**
 * Swap event ABI
 * event Swap(
 *     address indexed sender,
 *     address indexed recipient,
 *     int256 amount0,
 *     int256 amount1,
 *     uint160 sqrtPriceX96,
 *     uint128 liquidity,
 *     int24 tick,
 *     uint128 protocolFeesToken0,
 *     uint128 protocolFeesToken1
 * )
 */
export const SWAP_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'sender', type: 'address' },
    { indexed: true, name: 'recipient', type: 'address' },
    { indexed: false, name: 'amount0', type: 'int256' },
    { indexed: false, name: 'amount1', type: 'int256' },
    { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
    { indexed: false, name: 'liquidity', type: 'uint128' },
    { indexed: false, name: 'tick', type: 'int24' },
    { indexed: false, name: 'protocolFeesToken0', type: 'uint128' },
    { indexed: false, name: 'protocolFeesToken1', type: 'uint128' },
  ],
  name: 'Swap',
  type: 'event',
} as const;

// Create interface for parsing
const swapEventInterface = new ethers.Interface([SWAP_EVENT_ABI]);

/**
 * Get Swap event topic hash
 * Used for filtering WebSocket events
 */
export function getSwapEventTopic(): string {
  return swapEventInterface.getEvent('Swap')!.topicHash;
}

/**
 * Parse Swap event from log
 *
 * @param log Event log from WebSocket or RPC
 * @returns SwapEventData or null if parsing fails
 */
export function parseSwapEvent(log: ethers.Log): SwapEventData | null {
  try {
    // Parse log using interface
    const parsed = swapEventInterface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });

    if (!parsed || parsed.name !== 'Swap') {
      return null;
    }

    // Extract pool address from log
    const poolAddress = ethers.getAddress(log.address);

    // Extract event data
    const amount0 = parsed.args.amount0 as bigint;
    const amount1 = parsed.args.amount1 as bigint;
    const sqrtPriceX96 = parsed.args.sqrtPriceX96 as bigint;
    const liquidity = parsed.args.liquidity as bigint;
    const tickRaw = parsed.args.tick;

    // Convert int24 tick to signed number
    const tick = int24ToSigned(tickRaw);

    // Get block number and transaction hash
    const blockNumber = log.blockNumber || 0;
    const transactionHash = log.transactionHash || '0x';

    return {
      poolAddress: poolAddress.toLowerCase(),
      sqrtPriceX96,
      liquidity,
      tick,
      amount0,
      amount1,
      blockNumber,
      transactionHash,
      timestamp: Date.now() / 1000, // Current timestamp
    };
  } catch (error) {
    // Silent fail for event parsing (logger would be injected if needed)
    return null;
  }
}

/**
 * Create event filter for a pool's Swap events
 *
 * @param poolAddress Address of the pool
 * @returns Event filter object for ethers.js
 */
export function createSwapEventFilter(poolAddress: string): {
  address: string;
  topics: string[];
} {
  return {
    address: ethers.getAddress(poolAddress),
    topics: [getSwapEventTopic()],
  };
}

