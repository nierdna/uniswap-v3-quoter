/**
 * Typed EventEmitter
 * Type-safe wrapper around Node.js EventEmitter
 */

import { EventEmitter } from 'events';

/**
 * Type-safe EventEmitter
 * Provides compile-time checking of event names and listener signatures
 *
 * @template TEvents Event map defining event names and their listener signatures
 */
export class TypedEventEmitter<TEvents extends Record<string, (...args: any[]) => void>> {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners for production use
    this.emitter.setMaxListeners(100);
  }

  /**
   * Add event listener (type-safe)
   */
  on<K extends keyof TEvents>(event: K, listener: TEvents[K]): this {
    this.emitter.on(event as string, listener as any);
    return this;
  }

  /**
   * Add one-time event listener (type-safe)
   */
  once<K extends keyof TEvents>(event: K, listener: TEvents[K]): this {
    this.emitter.once(event as string, listener as any);
    return this;
  }

  /**
   * Remove event listener (type-safe)
   */
  off<K extends keyof TEvents>(event: K, listener: TEvents[K]): this {
    this.emitter.off(event as string, listener as any);
    return this;
  }

  /**
   * Emit event (type-safe)
   */
  emit<K extends keyof TEvents>(
    event: K,
    ...args: Parameters<TEvents[K]>
  ): boolean {
    return this.emitter.emit(event as string, ...args);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): this {
    this.emitter.removeAllListeners(event as string);
    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }

  /**
   * Get all listeners for an event
   */
  listeners<K extends keyof TEvents>(event: K): TEvents[K][] {
    return this.emitter.listeners(event as string) as TEvents[K][];
  }
}

