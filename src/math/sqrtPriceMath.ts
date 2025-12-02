/**
 * SqrtPriceMath Library
 * Ported from Solidity: v3-core/contracts/libraries/SqrtPriceMath.sol
 *
 * Functions based on Q64.96 sqrt price and liquidity
 * Contains the math that uses square root of price as a Q64.96 and liquidity to compute deltas
 */

import { mulDiv, mulDivRoundingUp } from './fullMath';

export const Q96 = 1n << 96n; // 2^96

/**
 * Helper: Division rounding up
 */
function divRoundingUp(x: bigint, y: bigint): bigint {
  return (x + y - 1n) / y;
}

/**
 * Gets the next sqrt price given a delta of token0
 * Always rounds up
 *
 * @param sqrtPX96 The starting price (Q64.96)
 * @param liquidity The amount of usable liquidity
 * @param amount How much of token0 to add or remove from virtual reserves
 * @param add Whether to add or remove the amount of token0
 * @returns The price after adding or removing amount
 */
function getNextSqrtPriceFromAmount0RoundingUp(
  sqrtPX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean
): bigint {
  if (amount === 0n) {
    return sqrtPX96;
  }

  const numerator1 = liquidity << 96n;

  if (add) {
    const product = amount * sqrtPX96;
    if (product / amount === sqrtPX96) {
      const denominator = numerator1 + product;
      if (denominator >= numerator1) {
        return mulDivRoundingUp(numerator1, sqrtPX96, denominator);
      }
    }

    return divRoundingUp(numerator1, numerator1 / sqrtPX96 + amount);
  } else {
    const product = amount * sqrtPX96;
    if (product / amount !== sqrtPX96) {
      throw new Error('Multiplication overflow');
    }
    if (numerator1 <= product) {
      throw new Error('Denominator underflow');
    }
    const denominator = numerator1 - product;
    return mulDivRoundingUp(numerator1, sqrtPX96, denominator);
  }
}

/**
 * Gets the next sqrt price given a delta of token1
 * Always rounds down
 *
 * @param sqrtPX96 The starting price (Q64.96)
 * @param liquidity The amount of usable liquidity
 * @param amount How much of token1 to add or remove from virtual reserves
 * @param add Whether to add or remove the amount of token1
 * @returns The price after adding or removing amount
 */
function getNextSqrtPriceFromAmount1RoundingDown(
  sqrtPX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean
): bigint {
  if (add) {
    let quotient: bigint;
    if (amount <= (1n << 160n) - 1n) {
      quotient = (amount << 96n) / liquidity;
    } else {
      quotient = mulDiv(amount, Q96, liquidity);
    }

    return sqrtPX96 + quotient;
  } else {
    let quotient: bigint;
    if (amount <= (1n << 160n) - 1n) {
      quotient = divRoundingUp(amount << 96n, liquidity);
    } else {
      quotient = mulDivRoundingUp(amount, Q96, liquidity);
    }

    if (sqrtPX96 <= quotient) {
      throw new Error('Price underflow');
    }
    return sqrtPX96 - quotient;
  }
}

/**
 * Gets the next sqrt price given an input amount of token0 or token1
 *
 * @param sqrtPX96 The starting price
 * @param liquidity The amount of usable liquidity
 * @param amountIn How much of token0 or token1 is being swapped in
 * @param zeroForOne Whether the amount in is token0 or token1
 * @returns sqrtQX96 The price after adding the input amount
 */
export function getNextSqrtPriceFromInput(
  sqrtPX96: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): bigint {
  if (sqrtPX96 <= 0n) {
    throw new Error('Price must be positive');
  }
  if (liquidity <= 0n) {
    throw new Error('Liquidity must be positive');
  }

  if (zeroForOne) {
    return getNextSqrtPriceFromAmount0RoundingUp(sqrtPX96, liquidity, amountIn, true);
  } else {
    return getNextSqrtPriceFromAmount1RoundingDown(sqrtPX96, liquidity, amountIn, true);
  }
}

/**
 * Gets the next sqrt price given an output amount of token0 or token1
 *
 * @param sqrtPX96 The starting price
 * @param liquidity The amount of usable liquidity
 * @param amountOut How much of token0 or token1 is being swapped out
 * @param zeroForOne Whether the amount out is token0 or token1
 * @returns sqrtQX96 The price after removing the output amount
 */
export function getNextSqrtPriceFromOutput(
  sqrtPX96: bigint,
  liquidity: bigint,
  amountOut: bigint,
  zeroForOne: boolean
): bigint {
  if (sqrtPX96 <= 0n) {
    throw new Error('Price must be positive');
  }
  if (liquidity <= 0n) {
    throw new Error('Liquidity must be positive');
  }

  if (zeroForOne) {
    return getNextSqrtPriceFromAmount1RoundingDown(sqrtPX96, liquidity, amountOut, false);
  } else {
    return getNextSqrtPriceFromAmount0RoundingUp(sqrtPX96, liquidity, amountOut, false);
  }
}

/**
 * Gets the amount0 delta between two prices
 * Calculates liquidity / sqrt(lower) - liquidity / sqrt(upper)
 *
 * @param sqrtRatioAX96 A sqrt price
 * @param sqrtRatioBX96 Another sqrt price
 * @param liquidity The amount of usable liquidity
 * @param roundUp Whether to round the amount up or down
 * @returns amount0 Amount of token0 required to cover a position of size liquidity between the two prices
 */
export function getAmount0Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean
): bigint {
  let sqrtRatioA = sqrtRatioAX96;
  let sqrtRatioB = sqrtRatioBX96;

  if (sqrtRatioA > sqrtRatioB) {
    [sqrtRatioA, sqrtRatioB] = [sqrtRatioB, sqrtRatioA];
  }

  const numerator1 = liquidity << 96n;
  const numerator2 = sqrtRatioB - sqrtRatioA;

  if (sqrtRatioA <= 0n) {
    throw new Error('sqrt_ratio_ax96 must be positive');
  }

  if (roundUp) {
    return divRoundingUp(mulDivRoundingUp(numerator1, numerator2, sqrtRatioB), sqrtRatioA);
  } else {
    return mulDiv(numerator1, numerator2, sqrtRatioB) / sqrtRatioA;
  }
}

/**
 * Gets the amount1 delta between two prices
 * Calculates liquidity * (sqrt(upper) - sqrt(lower))
 *
 * @param sqrtRatioAX96 A sqrt price
 * @param sqrtRatioBX96 Another sqrt price
 * @param liquidity The amount of usable liquidity
 * @param roundUp Whether to round the amount up or down
 * @returns amount1 Amount of token1 required to cover a position of size liquidity between the two prices
 */
export function getAmount1Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean
): bigint {
  let sqrtRatioA = sqrtRatioAX96;
  let sqrtRatioB = sqrtRatioBX96;

  if (sqrtRatioA > sqrtRatioB) {
    [sqrtRatioA, sqrtRatioB] = [sqrtRatioB, sqrtRatioA];
  }

  if (roundUp) {
    return mulDivRoundingUp(liquidity, sqrtRatioB - sqrtRatioA, Q96);
  } else {
    return mulDiv(liquidity, sqrtRatioB - sqrtRatioA, Q96);
  }
}

