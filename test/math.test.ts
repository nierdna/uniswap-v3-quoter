/**
 * Math Libraries Tests
 * Tests for TickMath, FullMath, and other math utilities
 */

import {
  MIN_TICK,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
  getSqrtRatioAtTick,
  getTickAtSqrtRatio,
  mulDiv,
  mulDivRoundingUp,
  getAmount0Delta,
  getAmount1Delta,
} from '../src/math';

describe('TickMath', () => {
  describe('getSqrtRatioAtTick', () => {
    it('should return MIN_SQRT_RATIO for MIN_TICK', () => {
      expect(getSqrtRatioAtTick(MIN_TICK)).toBe(MIN_SQRT_RATIO);
    });

    it('should return MAX_SQRT_RATIO for MAX_TICK', () => {
      expect(getSqrtRatioAtTick(MAX_TICK)).toBe(MAX_SQRT_RATIO);
    });

    it('should throw for tick out of bounds', () => {
      expect(() => getSqrtRatioAtTick(MIN_TICK - 1)).toThrow();
      expect(() => getSqrtRatioAtTick(MAX_TICK + 1)).toThrow();
    });

    it('should return expected value for tick 0', () => {
      const sqrtPrice = getSqrtRatioAtTick(0);
      // At tick 0, sqrt(1.0001^0) = 1, so sqrtPriceX96 = 1 * 2^96
      expect(sqrtPrice).toBe(79228162514264337593543950336n);
    });
  });

  describe('getTickAtSqrtRatio', () => {
    it('should return MIN_TICK for MIN_SQRT_RATIO', () => {
      expect(getTickAtSqrtRatio(MIN_SQRT_RATIO)).toBe(MIN_TICK);
    });

    it('should return MAX_TICK - 1 for MAX_SQRT_RATIO - 1', () => {
      expect(getTickAtSqrtRatio(MAX_SQRT_RATIO - 1n)).toBe(MAX_TICK - 1);
    });

    it('should throw for ratio out of bounds', () => {
      expect(() => getTickAtSqrtRatio(MIN_SQRT_RATIO - 1n)).toThrow();
      expect(() => getTickAtSqrtRatio(MAX_SQRT_RATIO)).toThrow();
    });

    it('should return 0 for sqrt price at tick 0', () => {
      const sqrtPrice = getSqrtRatioAtTick(0);
      expect(getTickAtSqrtRatio(sqrtPrice)).toBe(0);
    });
  });

  describe('Roundtrip conversion', () => {
    it('should convert tick -> sqrt price -> tick correctly', () => {
      const testTicks = [-100000, -10000, -1000, 0, 1000, 10000, 100000];

      for (const tick of testTicks) {
        const sqrtPrice = getSqrtRatioAtTick(tick);
        const recoveredTick = getTickAtSqrtRatio(sqrtPrice);
        expect(recoveredTick).toBe(tick);
      }
    });
  });
});

describe('FullMath', () => {
  describe('mulDiv', () => {
    it('should calculate simple multiplication and division', () => {
      const result = mulDiv(100n, 200n, 50n);
      expect(result).toBe(400n);
    });

    it('should handle large numbers without overflow', () => {
      const a = (1n << 128n) - 1n; // Large number
      const b = (1n << 128n) - 1n;
      const denominator = (1n << 128n);
      
      const result = mulDiv(a, b, denominator);
      expect(result).toBeGreaterThan(0n);
    });

    it('should throw on division by zero', () => {
      expect(() => mulDiv(100n, 200n, 0n)).toThrow('Denominator must be greater than 0');
    });

    it('should return exact result', () => {
      const result = mulDiv(1000n, 3000n, 1000n);
      expect(result).toBe(3000n);
    });
  });

  describe('mulDivRoundingUp', () => {
    it('should round up when there is a remainder', () => {
      const result = mulDivRoundingUp(100n, 3n, 2n);
      expect(result).toBe(150n); // 300/2 = 150, no rounding needed

      const result2 = mulDivRoundingUp(100n, 3n, 4n);
      expect(result2).toBe(75n); // 300/4 = 75, no remainder

      const result3 = mulDivRoundingUp(101n, 3n, 4n);
      expect(result3).toBe(76n); // 303/4 = 75.75, rounds up to 76
    });
  });
});

describe('SqrtPriceMath', () => {
  describe('getAmount0Delta', () => {
    it('should calculate amount0 delta correctly', () => {
      const sqrtRatioA = getSqrtRatioAtTick(-100);
      const sqrtRatioB = getSqrtRatioAtTick(100);
      const liquidity = 1000000000000000000n;

      const amount0 = getAmount0Delta(sqrtRatioA, sqrtRatioB, liquidity, true);
      expect(amount0).toBeGreaterThan(0n);
    });

    it('should handle swapped ratios', () => {
      const sqrtRatioA = getSqrtRatioAtTick(100);
      const sqrtRatioB = getSqrtRatioAtTick(-100);
      const liquidity = 1000000000000000000n;

      const amount0_1 = getAmount0Delta(sqrtRatioA, sqrtRatioB, liquidity, true);
      const amount0_2 = getAmount0Delta(sqrtRatioB, sqrtRatioA, liquidity, true);
      
      expect(amount0_1).toBe(amount0_2);
    });
  });

  describe('getAmount1Delta', () => {
    it('should calculate amount1 delta correctly', () => {
      const sqrtRatioA = getSqrtRatioAtTick(-100);
      const sqrtRatioB = getSqrtRatioAtTick(100);
      const liquidity = 1000000000000000000n;

      const amount1 = getAmount1Delta(sqrtRatioA, sqrtRatioB, liquidity, true);
      expect(amount1).toBeGreaterThan(0n);
    });
  });
});

