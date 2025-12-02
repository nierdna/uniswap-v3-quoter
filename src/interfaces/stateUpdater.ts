/**
 * State Updater Interface
 * Defines contract for updating pool states
 * Follows Dependency Inversion Principle
 */

import type { SwapEventData } from '../websocket/types';

/**
 * Interface for components that can update pool state
 * Used to break circular dependencies
 */
export interface IStateUpdater {
  /**
   * Handle Swap event and update pool state accordingly
   *
   * @param swapData Parsed Swap event data
   */
  onSwapEvent(swapData: SwapEventData): void;
}

