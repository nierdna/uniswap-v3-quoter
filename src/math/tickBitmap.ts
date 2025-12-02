/**
 * TickBitmap Library
 * Ported from Solidity: v3-core/contracts/libraries/TickBitmap.sol
 *
 * Stores a packed mapping of tick index to its initialized state
 * The mapping uses int16 for keys since ticks are represented as int24 and there are 256 (2^8) values per word
 */

/**
 * Find the most significant bit of a uint256
 */
function mostSignificantBit(x: bigint): number {
  if (x === 0n) {
    return 0;
  }

  let msb = 0;
  let value = x;

  if (value >= 0x100000000000000000000000000000000n) {
    value >>= 128n;
    msb += 128;
  }
  if (value >= 0x10000000000000000n) {
    value >>= 64n;
    msb += 64;
  }
  if (value >= 0x100000000n) {
    value >>= 32n;
    msb += 32;
  }
  if (value >= 0x10000n) {
    value >>= 16n;
    msb += 16;
  }
  if (value >= 0x100n) {
    value >>= 8n;
    msb += 8;
  }
  if (value >= 0x10n) {
    value >>= 4n;
    msb += 4;
  }
  if (value >= 0x4n) {
    value >>= 2n;
    msb += 2;
  }
  if (value >= 0x2n) {
    msb += 1;
  }

  return msb;
}

/**
 * Find the least significant bit of a uint256
 */
function leastSignificantBit(x: bigint): number {
  if (x === 0n) {
    return 0;
  }

  // Find the position of the least significant 1 bit
  let lsb = 0;
  let value = x;

  if ((value & 0xffffffffffffffffffffffffffffffffn) === 0n) {
    lsb += 128;
    value >>= 128n;
  }
  if ((value & 0xffffffffffffffffn) === 0n) {
    lsb += 64;
    value >>= 64n;
  }
  if ((value & 0xffffffffn) === 0n) {
    lsb += 32;
    value >>= 32n;
  }
  if ((value & 0xffffn) === 0n) {
    lsb += 16;
    value >>= 16n;
  }
  if ((value & 0xffn) === 0n) {
    lsb += 8;
    value >>= 8n;
  }
  if ((value & 0xfn) === 0n) {
    lsb += 4;
    value >>= 4n;
  }
  if ((value & 0x3n) === 0n) {
    lsb += 2;
    value >>= 2n;
  }
  if ((value & 0x1n) === 0n) {
    lsb += 1;
  }

  return lsb;
}

/**
 * Returns the next initialized tick contained in the same word (or adjacent word) as the tick that is either
 * to the left (less than or equal to) or right (greater than) of the given tick
 *
 * @param tickBitmap The mapping in which to compute the next initialized tick
 * @param tick The starting tick
 * @param tickSpacing The spacing between usable ticks
 * @param lte Whether to search for the next initialized tick to the left (less than or equal to the starting tick)
 * @returns Tuple of [next, initialized]:
 *          - next: The next initialized or uninitialized tick up to 256 ticks away from the current tick
 *          - initialized: Whether the next tick is initialized
 */
export function nextInitializedTickWithinOneWord(
  tickBitmap: Map<number, bigint>,
  tick: number,
  tickSpacing: number,
  lte: boolean
): [number, boolean] {
  let compressed = Math.floor(tick / tickSpacing);
  if (tick < 0 && tick % tickSpacing !== 0) {
    compressed -= 1; // Round towards negative infinity
  }

  if (lte) {
    const wordPos = compressed >> 8;
    const bitPos = compressed & 0xff;

    // All the 1s at or to the right of the current bitPos
    const mask = ((1n << BigInt(bitPos)) - 1n) + (1n << BigInt(bitPos));
    const masked = (tickBitmap.get(wordPos) || 0n) & mask;

    // If there are no initialized ticks to the right of or at the current tick, return rightmost in the word
    const initialized = masked !== 0n;

    // overflow/underflow is possible, but prevented externally by limiting both tickSpacing and tick
    let nextTick: number;
    if (initialized) {
      nextTick = (compressed - (bitPos - mostSignificantBit(masked))) * tickSpacing;
    } else {
      nextTick = (compressed - bitPos) * tickSpacing;
    }

    return [nextTick, initialized];
  } else {
    // Start from the word of the next tick, since the current tick state doesn't matter
    const wordPos = (compressed + 1) >> 8;
    const bitPos = (compressed + 1) & 0xff;

    // All the 1s at or to the left of the bitPos
    const mask = ~((1n << BigInt(bitPos)) - 1n);
    const masked = (tickBitmap.get(wordPos) || 0n) & mask;

    // If there are no initialized ticks to the left of the current tick, return leftmost in the word
    const initialized = masked !== 0n;

    // overflow/underflow is possible, but prevented externally by limiting both tickSpacing and tick
    let nextTick: number;
    if (initialized) {
      nextTick = (compressed + 1 + (leastSignificantBit(masked) - bitPos)) * tickSpacing;
    } else {
      nextTick = (compressed + 1 + (255 - bitPos)) * tickSpacing;
    }

    return [nextTick, initialized];
  }
}

