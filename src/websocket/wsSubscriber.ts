/**
 * WebSocket Subscriber
 * Subscribes to pool Swap events for real-time state updates
 * Ported from Python implementation with auto-reconnect support
 */

import { ethers } from 'ethers';
import { parseSwapEvent, createSwapEventFilter } from './eventParser';
import type { WebSocketConfig } from './types';
import { DEFAULT_WS_CONFIG } from './types';
import { createLogger, type ILogger, LogLevel } from '../utils/logger';
import { TypedEventEmitter } from '../utils/typedEventEmitter';
import type { WebSocketEvents } from './eventTypes';

/**
 * WebSocket subscriber for pool Swap events
 * Provides real-time state updates with low latency
 * Uses EventEmitter pattern for complete decoupling
 */
export class WebSocketSubscriber extends TypedEventEmitter<WebSocketEvents> {
  private wssUrl: string;
  private provider?: ethers.WebSocketProvider;
  private subscribedPools: Set<string>;
  private running: boolean;
  private logger: ILogger;

  // Reconnection state
  private reconnectCount: number;
  private reconnectMaxRetries: number;
  private reconnectDelay: number;
  private reconnectMaxDelay: number;

  // Event listeners map (poolAddress -> listener function)
  private eventListeners: Map<string, (log: ethers.Log) => void>;

  /**
   * Initialize WebSocketSubscriber
   *
   * @param config WebSocket configuration
   * @param logger Optional logger instance
   */
  constructor(config: WebSocketConfig, logger?: ILogger) {
    super(); // Initialize TypedEventEmitter

    this.wssUrl = config.wssUrl;
    this.subscribedPools = new Set();
    this.running = false;
    this.reconnectCount = 0;
    this.eventListeners = new Map();
    this.logger = logger || createLogger('WS', { level: LogLevel.INFO });

    // Set reconnection parameters
    this.reconnectMaxRetries = config.reconnectMaxRetries ?? DEFAULT_WS_CONFIG.reconnectMaxRetries;
    this.reconnectDelay = config.reconnectDelay ?? DEFAULT_WS_CONFIG.reconnectDelay;
    this.reconnectMaxDelay = config.reconnectMaxDelay ?? DEFAULT_WS_CONFIG.reconnectMaxDelay;
  }

  /**
   * Subscribe to Swap events for a pool
   *
   * @param poolAddress Address of the pool to subscribe
   */
  subscribePool(poolAddress: string): void {
    const checksumAddress = ethers.getAddress(poolAddress);

    if (this.subscribedPools.has(checksumAddress.toLowerCase())) {
      this.logger.debug(`Already subscribed to ${checksumAddress}`);
      return;
    }

    this.subscribedPools.add(checksumAddress.toLowerCase());

    // If already running, subscribe immediately
    if (this.running && this.provider) {
      this.subscribePoolInternal(checksumAddress);
    }

    this.logger.info(`Added subscription for ${checksumAddress}`);

    // Emit pool subscribed event
    this.emit('poolSubscribed', checksumAddress);
  }

  /**
   * Unsubscribe from pool Swap events
   *
   * @param poolAddress Address of the pool to unsubscribe
   */
  unsubscribePool(poolAddress: string): void {
    const checksumAddress = ethers.getAddress(poolAddress);
    const lowerAddress = checksumAddress.toLowerCase();

    if (!this.subscribedPools.has(lowerAddress)) {
      return;
    }

    // Remove listener if exists
    if (this.provider) {
      const listener = this.eventListeners.get(lowerAddress);
      if (listener) {
        this.provider.off(createSwapEventFilter(checksumAddress), listener);
        this.eventListeners.delete(lowerAddress);
      }
    }

    this.subscribedPools.delete(lowerAddress);
    this.logger.info(`Unsubscribed from ${checksumAddress}`);

    // Emit pool unsubscribed event
    this.emit('poolUnsubscribed', checksumAddress);
  }

  /**
   * Start WebSocket subscriber
   * Connects and subscribes to all pools (non-blocking)
   */
  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Subscriber already running');
      return;
    }

    this.running = true;
    this.logger.info(`Starting subscriber for ${this.subscribedPools.size} pool(s)`);

    // Start connection loop in background (non-blocking)
    this.connectAndSubscribe().catch((error) => {
      this.logger.error('Background connection error:', error);
    });

    // Wait a bit for initial connection
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Stop WebSocket subscriber
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.logger.info('Stopping subscriber...');
    this.running = false;

    await this.cleanup();

    this.logger.info('Subscriber stopped');
  }

  /**
   * Main connection loop with auto-reconnect
   */
  private async connectAndSubscribe(): Promise<void> {
    while (this.running) {
      try {
        this.logger.info(`Connecting to ${this.wssUrl}...`);

        // Create WebSocket provider
        this.provider = new ethers.WebSocketProvider(this.wssUrl);

        // Test connection
        const network = await this.provider.getNetwork();
        const blockNumber = await this.provider.getBlockNumber();
        this.logger.info(`Connected! Network: ${network.name} (chainId: ${network.chainId}), Block: ${blockNumber}`);

        // Emit connected event
        this.emit('connected', {
          chainId: network.chainId,
          blockNumber,
          network: network.name,
        });

        // Reset reconnect counter on successful connection
        this.reconnectCount = 0;

        // Subscribe to all pools
        for (const poolAddress of this.subscribedPools) {
          const checksumAddress = ethers.getAddress(poolAddress);
          this.subscribePoolInternal(checksumAddress);
        }

        // Wait for disconnect or stop
        await this.waitForDisconnect();

      } catch (error) {
        this.logger.error('Connection error:', error);
        this.emit('error', error as Error);

        await this.cleanup();

        // Emit disconnected event
        this.emit('disconnected', {
          reason: (error as Error).message,
          wasClean: false,
        });

        // Handle reconnection if still running
        if (this.running) {
          await this.handleReconnect();
        }
      }
    }
  }

  /**
   * Subscribe to pool's Swap events (internal)
   *
   * @param poolAddress Checksum address of the pool
   */
  private subscribePoolInternal(poolAddress: string): void {
    if (!this.provider) {
      this.logger.warn(`Not connected, cannot subscribe to ${poolAddress}`);
      return;
    }

    const filter = createSwapEventFilter(poolAddress);

    // Create listener function
    const listener = (log: ethers.Log) => {
      this.handleEvent(log);
    };

    // Store listener for later removal
    this.eventListeners.set(poolAddress.toLowerCase(), listener);

    // Subscribe to events
    this.provider.on(filter, listener);

    this.logger.info(`✓ Subscribed to ${poolAddress}`);
  }

  /**
   * Handle incoming Swap event
   *
   * @param log Event log from WebSocket
   */
  private handleEvent(log: ethers.Log): void {
    try {
      const swapData = parseSwapEvent(log);

      if (swapData) {
        // Emit swap event - listeners will handle it
        this.emit('swap', swapData);
      }
    } catch (error) {
      this.logger.error('Error handling event:', error);
      this.emit('parseError', error as Error, log);
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.reconnectCount++;

    // Check max retries
    if (this.reconnectMaxRetries > 0 && this.reconnectCount > this.reconnectMaxRetries) {
      this.logger.warn(
        `Max reconnection attempts (${this.reconnectMaxRetries}) reached. Stopping.`
      );
      this.running = false;
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectCount - 1),
      this.reconnectMaxDelay
    );

    this.logger.info(`Reconnecting in ${delay.toFixed(1)}s (attempt ${this.reconnectCount})...`);

    // Emit reconnecting event
    this.emit('reconnecting', {
      attempt: this.reconnectCount,
      delaySeconds: delay,
      maxRetries: this.reconnectMaxRetries,
    });

    await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  }

  /**
   * Wait for WebSocket disconnect
   */
  private async waitForDisconnect(): Promise<void> {
    if (!this.provider) {
      return;
    }

    return new Promise((resolve) => {
      // ethers.js v6 WebSocketProvider emits events differently
      // Listen for provider destroy
      this.provider!.once('error', (error: Error) => {
        this.logger.error('Provider error:', error);
        resolve();
      });

      // Also set a timeout check
      const checkInterval = setInterval(() => {
        if (!this.provider || this.provider.destroyed) {
          clearInterval(checkInterval);
          this.logger.info('Provider disconnected');
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Cleanup connection and listeners
   */
  private async cleanup(): Promise<void> {
    try {
      // Remove all event listeners
      if (this.provider) {
        for (const [poolAddress, listener] of this.eventListeners.entries()) {
          const checksumAddress = ethers.getAddress(poolAddress);
          const filter = createSwapEventFilter(checksumAddress);
          this.provider.off(filter, listener);
        }
        this.eventListeners.clear();

        // Destroy provider
        await this.provider.destroy();
        this.provider = undefined;
      }
    } catch (error) {
      this.logger.error('Cleanup error:', error);
    }
  }

  /**
   * Check if subscriber is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get number of subscribed pools
   */
  getSubscribedPoolCount(): number {
    return this.subscribedPools.size;
  }

  /**
   * Get list of subscribed pool addresses
   */
  getSubscribedPools(): string[] {
    return Array.from(this.subscribedPools);
  }
}

