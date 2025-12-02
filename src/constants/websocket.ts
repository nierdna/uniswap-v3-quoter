/**
 * WebSocket Constants
 * Default WSS URLs and configuration for various providers
 */

/**
 * Default WebSocket URLs for BSC providers
 * Note: Some providers require API keys
 */
export const DEFAULT_WSS_URLS = {
  // NodeReal - Recommended for BSC
  BSC_NODEREAL: 'wss://bsc-mainnet.nodereal.io/ws/v1/', // + API_KEY

  // Ankr - Public endpoint
  BSC_ANKR: 'wss://rpc.ankr.com/bsc/ws/', // May require API key for better rate limits

  // QuickNode - Premium provider
  BSC_QUICKNODE: 'wss://dimensional-divine-crater.bsc.quiknode.pro/', // + API_KEY

  // Binance - Public but may be rate-limited
  BSC_BINANCE: 'wss://bsc-ws-node.nariox.org:443',
};

/**
 * Default WebSocket configuration
 */
export const DEFAULT_WEBSOCKET_CONFIG = {
  reconnectMaxRetries: 0, // infinite retries
  reconnectDelay: 1.0, // 1 second initial delay
  reconnectMaxDelay: 30.0, // 30 seconds maximum delay
};

/**
 * Get recommended WSS URL for BSC
 * Note: Requires API key for most providers
 */
export function getRecommendedWssUrl(): string {
  return DEFAULT_WSS_URLS.BSC_NODEREAL;
}

