/**
 * Uniswap V3 Quoter
 * Main quoter implementation for calculating swap amounts without executing swaps
 * Ported from Python implementation
 */

import {
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
  getTickAtSqrtRatio,
  computeSwapStep,
  nextInitializedTickWithinOneWord,
  addDelta,
  getSqrtRatioAtTick,
  MIN_TICK,
  MAX_TICK,
} from './math';
import type { PoolState } from './types';
import type { StateFetcher } from './state';

/**
 * Uniswap V3 Quoter implementation in TypeScript
 * Provides local quote calculations without on-chain calls
 */
export class QuoterV3 {
  private stateFetcher?: StateFetcher;

  /**
   * Initialize QuoterV3
   *
   * @param stateFetcher Optional StateFetcher for fetching pool states from blockchain
   */
  constructor(stateFetcher?: StateFetcher) {
    this.stateFetcher = stateFetcher;
  }

  /**
   * Quote exact input for a single pool swap (sync version with PoolState)
   *
   * @param poolState The pool state containing all necessary data
   * @param zeroForOne True if swapping token0 for token1, False otherwise
   * @param amountIn Amount of input token
   * @param sqrtPriceLimitX96 Price limit (0 for no limit)
   * @returns amountOut Expected output amount
   */
  quoteExactInputSingle(
    poolState: PoolState,
    zeroForOne: boolean,
    amountIn: bigint,
    sqrtPriceLimitX96?: bigint
  ): bigint;

  /**
   * Quote exact input for a single pool swap (async version with pool address)
   *
   * @param poolAddress Pool address to fetch state for
   * @param zeroForOne True if swapping token0 for token1
   * @param amountIn Amount of input token
   * @param sqrtPriceLimitX96 Price limit (0 for no limit)
   * @returns Promise of expected output amount
   */
  quoteExactInputSingle(
    poolAddress: string,
    zeroForOne: boolean,
    amountIn: bigint,
    sqrtPriceLimitX96?: bigint
  ): Promise<bigint>;

  /**
   * Implementation of quoteExactInputSingle (handles both sync and async)
   */
  quoteExactInputSingle(
    poolStateOrAddress: PoolState | string,
    zeroForOne: boolean,
    amountIn: bigint,
    sqrtPriceLimitX96?: bigint
  ): bigint | Promise<bigint> {
    // If string address provided, fetch state and return Promise
    if (typeof poolStateOrAddress === 'string') {
      return this.quoteExactInputSingleAsync(
        poolStateOrAddress,
        zeroForOne,
        amountIn,
        sqrtPriceLimitX96
      );
    }

    // Otherwise use provided PoolState (sync)
    return this.quoteExactInputSingleSync(
      poolStateOrAddress,
      zeroForOne,
      amountIn,
      sqrtPriceLimitX96
    );
  }

  /**
   * Async implementation - fetches pool state then quotes
   */
  private async quoteExactInputSingleAsync(
    poolAddress: string,
    zeroForOne: boolean,
    amountIn: bigint,
    sqrtPriceLimitX96?: bigint
  ): Promise<bigint> {
    if (!this.stateFetcher) {
      throw new Error('StateFetcher required for address-based quotes. Pass StateFetcher to constructor.');
    }

    const poolState = await this.stateFetcher.fetchPoolState(poolAddress);
    return this.quoteExactInputSingleSync(poolState, zeroForOne, amountIn, sqrtPriceLimitX96);
  }

  /**
   * Sync implementation - quotes using provided pool state
   */
  private quoteExactInputSingleSync(
    poolState: PoolState,
    zeroForOne: boolean,
    amountIn: bigint,
    sqrtPriceLimitX96?: bigint
  ): bigint {
    // Set price limit if not specified
    let priceLimit = sqrtPriceLimitX96;
    if (!priceLimit || priceLimit === 0n) {
      priceLimit = zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n;
    }

    // Validate price limit
    if (zeroForOne) {
      if (priceLimit >= poolState.sqrtPriceX96) {
        throw new Error('Price limit too high');
      }
      if (priceLimit <= MIN_SQRT_RATIO) {
        throw new Error('Price limit too low');
      }
    } else {
      if (priceLimit <= poolState.sqrtPriceX96) {
        throw new Error('Price limit too low');
      }
      if (priceLimit >= MAX_SQRT_RATIO) {
        throw new Error('Price limit too high');
      }
    }

    // Initialize swap state
    let amountSpecifiedRemaining = amountIn;
    let amountCalculated = 0n;
    let sqrtPriceX96 = poolState.sqrtPriceX96;
    let tick = poolState.tick;
    let liquidity = poolState.liquidity;

    // Main swap loop
    while (amountSpecifiedRemaining > 0n && sqrtPriceX96 !== priceLimit) {
      // Find next initialized tick
      const [tickNext, initialized] = nextInitializedTickWithinOneWord(
        poolState.tickBitmap,
        tick,
        poolState.tickSpacing,
        zeroForOne
      );

      // Ensure tick is within bounds
      let tickNextBounded = tickNext;
      if (tickNext < MIN_TICK) {
        tickNextBounded = MIN_TICK;
      } else if (tickNext > MAX_TICK) {
        tickNextBounded = MAX_TICK;
      }

      // Get sqrt price at next tick
      const sqrtPriceNextX96 = getSqrtRatioAtTick(tickNextBounded);

      // Compute swap step
      const targetPrice =
        (zeroForOne && sqrtPriceNextX96 < priceLimit) || (!zeroForOne && sqrtPriceNextX96 > priceLimit)
          ? sqrtPriceNextX96
          : priceLimit;

      const swapStep = computeSwapStep(
        sqrtPriceX96,
        targetPrice,
        liquidity,
        amountSpecifiedRemaining,
        poolState.fee
      );

      sqrtPriceX96 = swapStep.sqrtRatioNextX96;

      // Update amounts
      amountSpecifiedRemaining -= swapStep.amountIn + swapStep.feeAmount;
      amountCalculated += swapStep.amountOut;

      // If we reached the next tick, cross it
      if (sqrtPriceX96 === sqrtPriceNextX96) {
        if (initialized) {
          // Get tick info
          const tickInfo = poolState.ticks.get(tickNextBounded);
          if (tickInfo && tickInfo.initialized) {
            let liquidityNet = tickInfo.liquidityNet;

            // If we're moving leftward, we interpret liquidityNet as opposite sign
            if (zeroForOne) {
              liquidityNet = -liquidityNet;
            }

            // Update liquidity
            liquidity = addDelta(liquidity, liquidityNet);
          }
        }

        // Update tick
        tick = zeroForOne ? tickNextBounded - 1 : tickNextBounded;
      } else if (sqrtPriceX96 !== poolState.sqrtPriceX96) {
        // Recompute tick if price changed but didn't cross
        tick = getTickAtSqrtRatio(sqrtPriceX96);
      }
    }

    return amountCalculated;
  }

  /**
   * Quote exact output for a single pool swap
   * Note: This is a simplified version - full implementation would require exact output logic
   *
   * @param _poolState The pool state containing all necessary data
   * @param _zeroForOne True if swapping token0 for token1
   * @param _amountOut Desired amount of output token
   * @param _sqrtPriceLimitX96 Price limit (0 for no limit)
   * @returns amountIn Required input amount
   */
  quoteExactOutputSingle(
    _poolState: PoolState,
    _zeroForOne: boolean,
    _amountOut: bigint,
    _sqrtPriceLimitX96?: bigint
  ): bigint {
    // Note: This would require implementing the exact output swap logic
    // which is similar but uses negative amounts. For minimal version,
    // we can throw not implemented error or implement if needed.
    throw new Error('quoteExactOutputSingle not implemented in minimal version');
  }
}

