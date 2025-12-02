/**
 * SwapMath Library
 * Ported from Solidity: v3-core/contracts/libraries/SwapMath.sol
 *
 * Computes the result of a swap within ticks
 * Contains methods for computing the result of a swap within a single tick price range
 */

import { mulDiv, mulDivRoundingUp } from './fullMath';
import {
  getAmount0Delta,
  getAmount1Delta,
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
} from './sqrtPriceMath';

export interface SwapStepResult {
  sqrtRatioNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
}

/**
 * Computes the result of swapping some amount in, or amount out, given the parameters of the swap
 *
 * The fee, plus the amount in, will never exceed the amount remaining if the swap's amountSpecified is positive
 *
 * @param sqrtRatioCurrentX96 The current sqrt price of the pool
 * @param sqrtRatioTargetX96 The price that cannot be exceeded, from which the direction is inferred
 * @param liquidity The usable liquidity
 * @param amountRemaining How much input or output amount is remaining to be swapped in/out
 * @param feePips The fee taken from the input amount, expressed in hundredths of a bip
 * @returns SwapStepResult containing:
 *          - sqrtRatioNextX96: The price after swapping the amount in/out, not to exceed the price target
 *          - amountIn: The amount to be swapped in, of either token0 or token1, based on the direction
 *          - amountOut: The amount to be received, of either token0 or token1, based on the direction
 *          - feeAmount: The amount of input that will be taken as a fee
 */
export function computeSwapStep(
  sqrtRatioCurrentX96: bigint,
  sqrtRatioTargetX96: bigint,
  liquidity: bigint,
  amountRemaining: bigint,
  feePips: number
): SwapStepResult {
  const zeroForOne = sqrtRatioCurrentX96 >= sqrtRatioTargetX96;
  const exactIn = amountRemaining >= 0n;

  let sqrtRatioNextX96: bigint;
  let amountIn = 0n;
  let amountOut = 0n;
  let feeAmount: bigint;

  if (exactIn) {
    const amountRemainingLessFee = mulDiv(
      amountRemaining,
      BigInt(1_000_000 - feePips),
      1_000_000n
    );

    if (zeroForOne) {
      amountIn = getAmount0Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, true);
    } else {
      amountIn = getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, true);
    }

    if (amountRemainingLessFee >= amountIn) {
      sqrtRatioNextX96 = sqrtRatioTargetX96;
    } else {
      sqrtRatioNextX96 = getNextSqrtPriceFromInput(
        sqrtRatioCurrentX96,
        liquidity,
        amountRemainingLessFee,
        zeroForOne
      );
    }
  } else {
    if (zeroForOne) {
      amountOut = getAmount1Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, false);
    } else {
      amountOut = getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, false);
    }

    if (-amountRemaining >= amountOut) {
      sqrtRatioNextX96 = sqrtRatioTargetX96;
    } else {
      sqrtRatioNextX96 = getNextSqrtPriceFromOutput(
        sqrtRatioCurrentX96,
        liquidity,
        -amountRemaining,
        zeroForOne
      );
    }
  }

  const maxPriceReached = sqrtRatioTargetX96 === sqrtRatioNextX96;

  // Get the input/output amounts
  if (zeroForOne) {
    if (maxPriceReached && exactIn) {
      // amountIn already computed
    } else {
      amountIn = getAmount0Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, true);
    }

    if (maxPriceReached && !exactIn) {
      // amountOut already computed
    } else {
      amountOut = getAmount1Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, false);
    }
  } else {
    if (maxPriceReached && exactIn) {
      // amountIn already computed
    } else {
      amountIn = getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, true);
    }

    if (maxPriceReached && !exactIn) {
      // amountOut already computed
    } else {
      amountOut = getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, false);
    }
  }

  // Cap the output amount to not exceed the remaining output amount
  if (!exactIn && amountOut > -amountRemaining) {
    amountOut = -amountRemaining;
  }

  if (exactIn && sqrtRatioNextX96 !== sqrtRatioTargetX96) {
    // We didn't reach the target, so take the remainder of the maximum input as fee
    feeAmount = amountRemaining - amountIn;
  } else {
    feeAmount = mulDivRoundingUp(amountIn, BigInt(feePips), BigInt(1_000_000 - feePips));
  }

  return {
    sqrtRatioNextX96,
    amountIn,
    amountOut,
    feeAmount,
  };
}

