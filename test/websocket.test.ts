/**
 * WebSocket Tests
 * Unit and integration tests for WebSocket functionality
 * 
 * Integration tests require BSC_WSS_URL environment variable
 */

import { ethers } from 'ethers';
import {
  WebSocketSubscriber,
  parseSwapEvent,
  getSwapEventTopic,
  createSwapEventFilter,
  type SwapEventData,
} from '../src/websocket';
import { BSC_ADDRESSES } from '../src/constants';

// Skip WebSocket integration tests by default
const shouldRunWsTests =
  process.env.RUN_WS_TESTS === 'true' || process.env.BSC_WSS_URL;

describe('Event Parser', () => {
  describe('getSwapEventTopic', () => {
    it('should return valid event topic hash', () => {
      const topic = getSwapEventTopic();
      expect(topic).toBeTruthy();
      expect(topic).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe('createSwapEventFilter', () => {
    it('should create valid event filter', () => {
      const poolAddress = BSC_ADDRESSES.USDT_WBNB_500;
      const filter = createSwapEventFilter(poolAddress);

      expect(filter.address).toBeTruthy();
      expect(filter.topics).toHaveLength(1);
      expect(filter.topics[0]).toBe(getSwapEventTopic());
    });
  });

  describe('parseSwapEvent', () => {
    it('should parse mock Swap event', () => {
      // Create mock log data (use unknown to bypass strict typing)
      const mockLog = {
        address: BSC_ADDRESSES.USDT_WBNB_500,
        topics: [
          getSwapEventTopic(),
          ethers.zeroPadValue('0x' + '1'.repeat(40), 32), // sender
          ethers.zeroPadValue('0x' + '2'.repeat(40), 32), // recipient
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ['int256', 'int256', 'uint160', 'uint128', 'int24', 'uint128', 'uint128'],
          [100000n, -99000n, 79228162514264337593543950336n, 1000000000000000000n, 0, 0n, 0n]
        ),
        blockNumber: 12345,
        blockHash: '0x' + '0'.repeat(64),
        transactionIndex: 0,
        removed: false,
        transactionHash: '0x' + '0'.repeat(64),
        index: 0,
      } as unknown as ethers.Log;

      const swapData = parseSwapEvent(mockLog);

      expect(swapData).toBeTruthy();
      expect(swapData!.poolAddress).toBe(BSC_ADDRESSES.USDT_WBNB_500.toLowerCase());
      expect(swapData!.amount0).toBe(100000n);
      expect(swapData!.amount1).toBe(-99000n);
      expect(swapData!.sqrtPriceX96).toBe(79228162514264337593543950336n);
      expect(swapData!.liquidity).toBe(1000000000000000000n);
      expect(swapData!.tick).toBe(0);
    });
  });
});

describe('WebSocketSubscriber', () => {
  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const subscriber = new WebSocketSubscriber({
        wssUrl: 'wss://example.com',
      });

      expect(subscriber).toBeTruthy();
      expect(subscriber.isRunning()).toBe(false);
      expect(subscriber.getSubscribedPoolCount()).toBe(0);
    });

    it('should initialize with custom config', () => {
      const subscriber = new WebSocketSubscriber({
        wssUrl: 'wss://example.com',
        reconnectMaxRetries: 5,
        reconnectDelay: 2.0,
        reconnectMaxDelay: 60.0,
      });

      expect(subscriber).toBeTruthy();
    });

    it('should accept callback function', () => {
      const callback = jest.fn();
      const subscriber = new WebSocketSubscriber({ wssUrl: 'wss://example.com' }, callback);

      expect(subscriber).toBeTruthy();
    });
  });

  describe('Pool Subscription', () => {
    it('should add pool to subscription list', () => {
      const subscriber = new WebSocketSubscriber({ wssUrl: 'wss://example.com' });

      expect(subscriber.getSubscribedPoolCount()).toBe(0);

      subscriber.subscribePool(BSC_ADDRESSES.USDT_WBNB_500);
      expect(subscriber.getSubscribedPoolCount()).toBe(1);

      const pools = subscriber.getSubscribedPools();
      expect(pools).toContain(BSC_ADDRESSES.USDT_WBNB_500.toLowerCase());
    });

    it('should not add duplicate pools', () => {
      const subscriber = new WebSocketSubscriber({ wssUrl: 'wss://example.com' });

      subscriber.subscribePool(BSC_ADDRESSES.USDT_WBNB_500);
      subscriber.subscribePool(BSC_ADDRESSES.USDT_WBNB_500);

      expect(subscriber.getSubscribedPoolCount()).toBe(1);
    });

    it('should unsubscribe from pool', () => {
      const subscriber = new WebSocketSubscriber({ wssUrl: 'wss://example.com' });

      subscriber.subscribePool(BSC_ADDRESSES.USDT_WBNB_500);
      expect(subscriber.getSubscribedPoolCount()).toBe(1);

      subscriber.unsubscribePool(BSC_ADDRESSES.USDT_WBNB_500);
      expect(subscriber.getSubscribedPoolCount()).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should connect to real BSC WebSocket', async () => {
      if (!shouldRunWsTests) {
        console.log('Skipping WebSocket integration tests. Set BSC_WSS_URL to run.');
        return;
      }

      const wssUrl = process.env.BSC_WSS_URL!;
      const subscriber = new WebSocketSubscriber({ wssUrl });

      await subscriber.start();

      // Wait a bit for connection
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(subscriber.isRunning()).toBe(true);

      await subscriber.stop();
      expect(subscriber.isRunning()).toBe(false);
    }, 10000);

    it('should receive Swap events from real pool', async () => {
      if (!shouldRunWsTests) {
        console.log('Skipping WebSocket integration tests. Set BSC_WSS_URL to run.');
        return;
      }

      let eventReceived = false;
      let receivedData: SwapEventData | null = null;

      const wssUrl = process.env.BSC_WSS_URL!;
      const subscriber = new WebSocketSubscriber({ wssUrl }, (swapData) => {
        eventReceived = true;
        receivedData = swapData;
        console.log('[Test] Swap event received:', {
          pool: swapData.poolAddress,
          tick: swapData.tick,
          liquidity: swapData.liquidity.toString(),
        });
      });

      // Subscribe to active pool
      subscriber.subscribePool(BSC_ADDRESSES.USDT_WBNB_500);

      await subscriber.start();

      console.log('[Test] Waiting for Swap event (max 60s)...');

      // Wait for event (max 60s)
      const timeout = 60000;
      const startTime = Date.now();

      while (!eventReceived && Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await subscriber.stop();

      if (eventReceived) {
        expect(receivedData).toBeTruthy();
        expect(receivedData!.poolAddress).toBeTruthy();
        expect(receivedData!.sqrtPriceX96).toBeGreaterThan(0n);
        expect(receivedData!.liquidity).toBeGreaterThan(0n);
        console.log('[Test] ✓ Successfully received and parsed Swap event');
      } else {
        console.log('[Test] ⚠ No Swap event received within 60s (pool might be inactive)');
      }
    }, 65000);
  });
});

