/**
 * Custom Error Classes
 * Provides specific error types for better error handling
 */

/**
 * Base error class for all quoter errors
 */
export class QuoterError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    this.name = 'QuoterError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when price limit validation fails
 */
export class PriceLimitError extends QuoterError {
  constructor(
    message: string,
    public limit: bigint,
    public currentPrice: bigint,
    public zeroForOne: boolean
  ) {
    super(message, { limit, currentPrice, zeroForOne });
    this.name = 'PriceLimitError';
  }
}

/**
 * Error thrown when pool state fetch fails
 */
export class StateFetchError extends QuoterError {
  constructor(message: string, public poolAddress: string, public cause?: Error) {
    super(message, { poolAddress, cause });
    this.name = 'StateFetchError';
  }
}

/**
 * Error thrown for WebSocket-related issues
 */
export class WebSocketError extends QuoterError {
  constructor(message: string, public wssUrl?: string, public cause?: Error) {
    super(message, { wssUrl, cause });
    this.name = 'WebSocketError';
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends QuoterError {
  constructor(message: string, public field?: string, public value?: any) {
    super(message, { field, value });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when pool state is invalid or stale
 */
export class InvalidPoolStateError extends QuoterError {
  constructor(message: string, public poolAddress: string, public reason?: string) {
    super(message, { poolAddress, reason });
    this.name = 'InvalidPoolStateError';
  }
}

