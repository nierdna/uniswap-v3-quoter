/**
 * LiquidityMath Library
 * Ported from Solidity: v3-core/contracts/libraries/LiquidityMath.sol
 *
 * Math library for liquidity
 */

/**
 * Add a signed liquidity delta to liquidity and revert if it overflows or underflows
 *
 * @param x The liquidity before change (uint128)
 * @param y The delta by which liquidity should be changed (int128)
 * @returns z The liquidity after change (uint128)
 */
export function addDelta(x: bigint, y: bigint): bigint {
  let z: bigint;

  if (y < 0n) {
    // Convert y to positive for subtraction
    const yAbs = y !== -(1n << 127n) ? -y : 1n << 127n; // Handle int128 min
    z = x - yAbs;
    if (z >= x) {
      throw new Error('Liquidity underflow');
    }
  } else {
    z = x + y;
    if (z < x) {
      throw new Error('Liquidity overflow');
    }
  }

  return z;
}

