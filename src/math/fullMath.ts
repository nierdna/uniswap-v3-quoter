/**
 * FullMath Library
 * Ported from Solidity: v3-core/contracts/libraries/FullMath.sol
 *
 * Facilitates multiplication and division that can have overflow of an intermediate value without any loss of precision
 * Handles "phantom overflow" i.e., allows multiplication and division where an intermediate value overflows 256 bits
 */

/**
 * Calculates floor(a×b÷denominator) with full precision.
 * Throws if result overflows a uint256 or denominator == 0
 *
 * Credit to Remco Bloemen under MIT license https://xn--2-umb.com/21/muldiv
 *
 * @param a The multiplicand
 * @param b The multiplier
 * @param denominator The divisor
 * @returns The 256-bit result
 */
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error('Denominator must be greater than 0');
  }

  // 512-bit multiply [prod1 prod0] = a * b
  // Compute the product mod 2**256 and mod 2**256 - 1
  const prod0 = (a * b) & ((1n << 256n) - 1n); // Least significant 256 bits
  const prod1 = (a * b) >> 256n; // Most significant 256 bits

  // Handle non-overflow cases, 256 by 256 division
  if (prod1 === 0n) {
    return prod0 / denominator;
  }

  // Make sure the result is less than 2**256
  if (denominator <= prod1) {
    throw new Error('Result overflows uint256');
  }

  ///////////////////////////////////////////////
  // 512 by 256 division.
  ///////////////////////////////////////////////

  // Make division exact by subtracting the remainder from [prod1 prod0]
  const remainder = (a * b) % denominator;

  // Subtract 256 bit number from 512 bit number
  let prod1Adjusted = prod1 - (remainder > prod0 ? 1n : 0n);
  let prod0Adjusted = (prod0 - remainder) & ((1n << 256n) - 1n);

  // Factor powers of two out of denominator
  // Compute largest power of two divisor of denominator (always >= 1)
  let twos = denominator & (~denominator + 1n);

  // Divide denominator by power of two
  let denominatorAdjusted = denominator / twos;

  // Divide [prod1 prod0] by the factors of two
  prod0Adjusted = prod0Adjusted / twos;

  // Shift in bits from prod1 into prod0
  // Flip twos such that it is 2**256 / twos
  // If twos is zero, then it becomes one
  twos = (((1n << 256n) - twos) / twos) + 1n;
  prod0Adjusted = prod0Adjusted | (prod1Adjusted * twos);

  // Invert denominator mod 2**256
  // Now that denominator is an odd number, it has an inverse modulo 2**256
  // such that denominator * inv = 1 mod 2**256.
  // Compute the inverse by starting with a seed that is correct for four bits
  let inv = (3n * denominatorAdjusted) ^ 2n;

  // Use Newton-Raphson iteration to improve the precision
  // Thanks to Hensel's lifting lemma, this also works in modular arithmetic
  inv = (inv * (2n - denominatorAdjusted * inv)) & ((1n << 256n) - 1n); // inverse mod 2**8
  inv = (inv * (2n - denominatorAdjusted * inv)) & ((1n << 256n) - 1n); // inverse mod 2**16
  inv = (inv * (2n - denominatorAdjusted * inv)) & ((1n << 256n) - 1n); // inverse mod 2**32
  inv = (inv * (2n - denominatorAdjusted * inv)) & ((1n << 256n) - 1n); // inverse mod 2**64
  inv = (inv * (2n - denominatorAdjusted * inv)) & ((1n << 256n) - 1n); // inverse mod 2**128
  inv = (inv * (2n - denominatorAdjusted * inv)) & ((1n << 256n) - 1n); // inverse mod 2**256

  // Because the division is now exact we can divide by multiplying with the modular inverse
  const result = (prod0Adjusted * inv) & ((1n << 256n) - 1n);
  return result;
}

/**
 * Calculates ceil(a×b÷denominator) with full precision.
 * Throws if result overflows a uint256 or denominator == 0
 *
 * @param a The multiplicand
 * @param b The multiplier
 * @param denominator The divisor
 * @returns The 256-bit result rounded up
 */
export function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
  const result = mulDiv(a, b, denominator);
  if ((a * b) % denominator > 0n) {
    if (result >= (1n << 256n) - 1n) {
      throw new Error('Result overflows uint256');
    }
    return result + 1n;
  }
  return result;
}

