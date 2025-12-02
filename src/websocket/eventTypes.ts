/**
 * WebSocket Event Types
 * Type-safe event definitions for WebSocketSubscriber
 */

import type { SwapEventData } from './types';

/**
 * Connection info when WebSocket connects
 */
export interface ConnectionInfo {
  chainId: bigint;
  blockNumber: number;
  network: string;
}

/**
 * Disconnection info
 */
export interface DisconnectionInfo {
  reason?: string;
  wasClean: boolean;
}

/**
 * Reconnection attempt info
 */
export interface ReconnectionInfo {
  attempt: number;
  delaySeconds: number;
  maxRetries: number;
}

/**
 * WebSocket event map for type-safe events
 * This ensures compile-time checking of event names and data types
 */
export interface WebSocketEvents extends Record<string, (...args: any[]) => void> {
  // Swap event with full event data
  swap: (data: SwapEventData) => void;

  // Connection lifecycle events
  connected: (info: ConnectionInfo) => void;
  disconnected: (info: DisconnectionInfo) => void;
  reconnecting: (info: ReconnectionInfo) => void;

  // Error events
  error: (error: Error) => void;
  parseError: (error: Error, rawLog: any) => void;

  // Pool subscription events
  poolSubscribed: (poolAddress: string) => void;
  poolUnsubscribed: (poolAddress: string) => void;
}

