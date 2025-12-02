/**
 * WebSocket Types
 * Type definitions for WebSocket subscriber and event data
 */

/**
 * Parsed Swap event data from blockchain
 */
export interface SwapEventData {
  poolAddress: string;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  amount0: bigint;
  amount1: bigint;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  wssUrl: string;
  reconnectMaxRetries?: number; // 0 = infinite retries
  reconnectDelay?: number; // Initial delay in seconds (default: 1.0)
  reconnectMaxDelay?: number; // Max delay in seconds (default: 30.0)
}

/**
 * Default WebSocket configuration values
 */
export const DEFAULT_WS_CONFIG: Required<Omit<WebSocketConfig, 'wssUrl'>> = {
  reconnectMaxRetries: 0, // infinite retries
  reconnectDelay: 1.0, // 1 second
  reconnectMaxDelay: 30.0, // 30 seconds max
};

