/**
 * Encoding/Decoding Utilities
 * Helper functions for handling Solidity type conversions
 */

/**
 * Convert int24 from uint representation to signed integer
 * In Solidity, int24 uses two's complement. If the value >= 2^23, it's negative.
 *
 * @param value The uint24 value to convert
 * @returns Signed int24 value
 */
export function int24ToSigned(value: number | bigint): number {
  const val = typeof value === 'bigint' ? Number(value) : value;
  
  // Check if the sign bit (bit 23) is set
  if (val >= (1 << 23)) {
    // Negative number - subtract 2^24 to get the signed value
    return val - (1 << 24);
  }
  
  return val;
}

/**
 * Convert int128 from uint representation to signed BigInt
 * Similar to int24 but for 128-bit integers
 *
 * @param value The uint128 value to convert
 * @returns Signed int128 value
 */
export function int128ToSigned(value: bigint): bigint {
  // Check if the sign bit (bit 127) is set
  if (value >= (1n << 127n)) {
    // Negative number - subtract 2^128 to get the signed value
    return value - (1n << 128n);
  }
  
  return value;
}

/**
 * Decode slot0 manually to avoid padding validation issues with PancakeSwap V3
 * Ported from Python implementation
 *
 * @param rawData Raw bytes string (0x...) from slot0() call
 * @returns Decoded slot0 data
 */
export function decodeSlot0Manual(rawData: string): {
  sqrtPriceX96: bigint;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
} {
  // Remove '0x' prefix if present
  const data = rawData.startsWith('0x') ? rawData.slice(2) : rawData;
  
  // Each field is 32 bytes (64 hex chars) in ABI encoding
  
  // sqrtPriceX96 (uint160) - bytes 0-31
  const sqrtPriceX96 = BigInt('0x' + data.slice(0, 64));
  
  // tick (int24) - bytes 32-63
  const tickRaw = BigInt('0x' + data.slice(64, 128));
  const tick = int24ToSigned(tickRaw);
  
  // observationIndex (uint16) - bytes 64-95
  // Mask to 16 bits to handle padding
  const observationIndex = Number(BigInt('0x' + data.slice(128, 192)) & 0xFFFFn);
  
  // observationCardinality (uint16) - bytes 96-127
  const observationCardinality = Number(BigInt('0x' + data.slice(192, 256)) & 0xFFFFn);
  
  // observationCardinalityNext (uint16) - bytes 128-159
  const observationCardinalityNext = Number(BigInt('0x' + data.slice(256, 320)) & 0xFFFFn);
  
  // feeProtocol (uint8) - bytes 160-191
  // Mask to 8 bits
  const feeProtocol = Number(BigInt('0x' + data.slice(320, 384)) & 0xFFn);
  
  // unlocked (bool) - bytes 192-223
  const unlocked = BigInt('0x' + data.slice(384, 448)) !== 0n;
  
  return {
    sqrtPriceX96,
    tick,
    observationIndex,
    observationCardinality,
    observationCardinalityNext,
    feeProtocol,
    unlocked,
  };
}

/**
 * Convert hex string to bytes for manual decoding
 * @param hex Hex string with or without 0x prefix
 * @returns Byte array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  
  return bytes;
}

/**
 * Convert bytes to hex string
 * @param bytes Byte array
 * @returns Hex string with 0x prefix
 */
export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Pad hex string to specified byte length
 * @param hex Hex string
 * @param length Target byte length
 * @returns Padded hex string
 */
export function padHex(hex: string, length: number): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return '0x' + cleanHex.padStart(length * 2, '0');
}

