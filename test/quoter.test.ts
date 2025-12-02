/**
 * QuoterV3 Tests
 * Tests for quote calculations
 */

import { QuoterV3 } from '../src/quoter';
import { createMockPoolState, createCustomMockPoolState } from './mockState';

describe('QuoterV3', () => {
  let quoter: QuoterV3;

  beforeEach(() => {
    quoter = new QuoterV3();
  });

  describe('quoteExactInputSingle', () => {
    it('should quote a simple swap with mock state', () => {
      const poolState = createMockPoolState();
      const amountIn = 1000000000000000000n; // 1e18

      // Quote swap of token0 for token1
      const amountOut = quoter.quoteExactInputSingle(poolState, true, amountIn);

      // Should return some amount out
      expect(amountOut).toBeGreaterThan(0n);
      
      // Amount out should be less than amount in (due to fees)
      expect(amountOut).toBeLessThan(amountIn);
    });

    it('should handle zero for one swap', () => {
      const poolState = createMockPoolState();
      const amountIn = 1000000n; // Small amount

      const amountOut = quoter.quoteExactInputSingle(poolState, true, amountIn);
      expect(amountOut).toBeGreaterThan(0n);
    });

    it('should handle one for zero swap', () => {
      const poolState = createMockPoolState();
      const amountIn = 1000000n; // Small amount

      const amountOut = quoter.quoteExactInputSingle(poolState, false, amountIn);
      expect(amountOut).toBeGreaterThan(0n);
    });

    it('should throw on invalid price limit', () => {
      const poolState = createMockPoolState();
      const amountIn = 1000000n;

      // Price limit too high for zeroForOne
      expect(() => {
        quoter.quoteExactInputSingle(poolState, true, amountIn, poolState.sqrtPriceX96 + 1n);
      }).toThrow();

      // Price limit too low for oneForZero
      expect(() => {
        quoter.quoteExactInputSingle(poolState, false, amountIn, poolState.sqrtPriceX96 - 1n);
      }).toThrow();
    });

    it('should handle custom pool state', () => {
      const poolState = createCustomMockPoolState({
        currentTick: 1000,
        liquidity: 5000000000000000000n,
        fee: 500, // 0.05%
      });

      const amountIn = 100000000n;
      const amountOut = quoter.quoteExactInputSingle(poolState, true, amountIn);

      expect(amountOut).toBeGreaterThan(0n);
    });

    it('should return 0 for 0 input', () => {
      const poolState = createMockPoolState();
      const amountOut = quoter.quoteExactInputSingle(poolState, true, 0n);
      
      expect(amountOut).toBe(0n);
    });
  });

  describe('quoteExactOutputSingle', () => {
    it('should throw not implemented error', () => {
      const poolState = createMockPoolState();
      
      expect(() => {
        quoter.quoteExactOutputSingle(poolState, true, 1000000n);
      }).toThrow('not implemented');
    });
  });
});

