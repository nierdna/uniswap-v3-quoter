/**
 * TickMath Library
 * Ported from Solidity: v3-core/contracts/libraries/TickMath.sol
 *
 * Computes sqrt price for ticks of size 1.0001, i.e. sqrt(1.0001^tick) as fixed point Q64.96 numbers.
 * Supports prices between 2**-128 and 2**128
 */

// The minimum tick that may be passed to #getSqrtRatioAtTick computed from log base 1.0001 of 2**-128
export const MIN_TICK = -887272;

// The maximum tick that may be passed to #getSqrtRatioAtTick computed from log base 1.0001 of 2**128
export const MAX_TICK = 887272;

// The minimum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MIN_TICK)
export const MIN_SQRT_RATIO = 4295128739n;

// The maximum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MAX_TICK)
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

/**
 * Calculates sqrt(1.0001^tick) * 2^96
 *
 * @param tick The input tick for the above formula
 * @returns sqrtPriceX96 A Fixed point Q64.96 number representing the sqrt of the ratio
 *                       of the two assets (token1/token0) at the given tick
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = Math.abs(tick);
  if (absTick > MAX_TICK) {
    throw new Error(`Tick ${tick} out of bounds`);
  }

  // Precomputed values of sqrt(1.0001^(2^n)) * 2^128 for n = 0..19
  let ratio =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;

  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) {
    ratio = ((1n << 256n) - 1n) / ratio;
  }

  // Downcast from Q128.128 to Q128.96
  // We round up in the division so getTickAtSqrtRatio of the output price is always consistent
  const sqrtPriceX96 = (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);

  return sqrtPriceX96;
}

/**
 * Calculates the greatest tick value such that getRatioAtTick(tick) <= ratio
 *
 * @param sqrtPriceX96 The sqrt ratio for which to compute the tick as a Q64.96
 * @returns tick The greatest tick for which the ratio is less than or equal to the input ratio
 */
export function getTickAtSqrtRatio(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 < MIN_SQRT_RATIO || sqrtPriceX96 >= MAX_SQRT_RATIO) {
    throw new Error('sqrt_price_x96 out of bounds');
  }

  let ratio = sqrtPriceX96 << 32n;

  // Compute msb (most significant bit) of ratio
  let r = ratio;
  let msb = 0;

  // Binary search for MSB
  let f = r > 0xffffffffffffffffffffffffffffffffn ? 128 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0xffffffffffffffffn ? 64 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0xffffffffn ? 32 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0xffffn ? 16 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0xffn ? 8 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0xfn ? 4 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0x3n ? 2 : 0;
  msb |= f;
  r >>= BigInt(f);

  f = r > 0x1n ? 1 : 0;
  msb |= f;

  // Compute log_2 in Q128.128
  if (msb >= 128) {
    r = ratio >> BigInt(msb - 127);
  } else {
    r = ratio << BigInt(127 - msb);
  }

  let log2 = BigInt(msb - 128) << 64n;

  // Refine log_2 estimate with Taylor series
  for (let i = 0; i < 14; i++) {
    r = (r * r) >> 127n;
    f = Number(r >> 128n);
    log2 |= BigInt(f) << BigInt(63 - i);
    r >>= BigInt(f);
  }

  // Convert log_2 to log_sqrt10001
  const log_sqrt10001 = log2 * 255738958999603826347141n; // 128.128 number

  // Compute tick range
  let tickLow = Number(
    (log_sqrt10001 - 3402992956809132418596140100660247210n) >> 128n
  );
  let tickHi = Number(
    (log_sqrt10001 + 291339464771989622907027621153398088495n) >> 128n
  );

  // Handle sign conversion for JavaScript (int24 range)
  if (tickLow >= 1 << 23) {
    // int24 negative range
    tickLow -= 1 << 24;
  }
  if (tickHi >= 1 << 23) {
    tickHi -= 1 << 24;
  }

  if (tickLow === tickHi) {
    return tickLow;
  } else {
    return getSqrtRatioAtTick(tickHi) <= sqrtPriceX96 ? tickHi : tickLow;
  }
}

