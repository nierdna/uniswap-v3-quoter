/**
 * Pool State Management
 * Stores the current state of a Uniswap V3 pool in memory
 */

/**
 * Information stored for each initialized tick
 */
export interface TickInfo {
  liquidityGross: bigint; // uint128
  liquidityNet: bigint; // int128
  feeGrowthOutside0X128: bigint; // uint256
  feeGrowthOutside1X128: bigint; // uint256
  tickCumulativeOutside: bigint; // int56
  secondsPerLiquidityOutsideX128: bigint; // uint160
  secondsOutside: number; // uint32
  initialized: boolean;
}

/**
 * State of a Uniswap V3 Pool
 * Stores all necessary information to perform quote calculations locally
 */
export interface PoolState {
  // Pool address
  address: string;

  // Token addresses
  token0: string;
  token1: string;

  // Immutable pool parameters
  fee: number; // uint24 - fee in hundredths of a bip (e.g., 3000 = 0.3%)
  tickSpacing: number; // int24

  // Current pool state (from slot0)
  sqrtPriceX96: bigint; // uint160
  tick: number; // int24
  observationIndex: number; // uint16
  observationCardinality: number; // uint16
  observationCardinalityNext: number; // uint16
  feeProtocol: number; // uint8
  unlocked: boolean;

  // Current liquidity
  liquidity: bigint; // uint128

  // Fee growth global
  feeGrowthGlobal0X128: bigint; // uint256
  feeGrowthGlobal1X128: bigint; // uint256

  // Tick data - only store initialized ticks
  ticks: Map<number, TickInfo>;

  // Tick bitmap - mapping of int16 -> uint256
  tickBitmap: Map<number, bigint>;

  // Metadata
  lastUpdateBlock?: number;
  lastUpdateTimestamp?: number;
}

/**
 * Helper function to create a default TickInfo
 */
export function createTickInfo(partial?: Partial<TickInfo>): TickInfo {
  return {
    liquidityGross: 0n,
    liquidityNet: 0n,
    feeGrowthOutside0X128: 0n,
    feeGrowthOutside1X128: 0n,
    tickCumulativeOutside: 0n,
    secondsPerLiquidityOutsideX128: 0n,
    secondsOutside: 0,
    initialized: false,
    ...partial,
  };
}

/**
 * Helper function to create a default PoolState
 */
export function createPoolState(partial: Partial<PoolState> & Pick<PoolState, 'address' | 'token0' | 'token1' | 'fee' | 'tickSpacing'>): PoolState {
  return {
    sqrtPriceX96: 0n,
    tick: 0,
    observationIndex: 0,
    observationCardinality: 0,
    observationCardinalityNext: 0,
    feeProtocol: 0,
    unlocked: true,
    liquidity: 0n,
    feeGrowthGlobal0X128: 0n,
    feeGrowthGlobal1X128: 0n,
    ticks: new Map(),
    tickBitmap: new Map(),
    ...partial,
  };
}

