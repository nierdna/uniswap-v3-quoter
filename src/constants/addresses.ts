/**
 * Contract Addresses for BSC (Binance Smart Chain)
 * PancakeSwap V3 deployments
 */

export const BSC_ADDRESSES = {
  // Multicall3 on BSC (same address across all EVM chains)
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11',

  // PancakeSwap V3 Factory on BSC
  PANCAKE_V3_FACTORY: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',

  // PancakeSwap V3 Quoter V2 (for comparison testing)
  PANCAKE_V3_QUOTER_V2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',

  // Example pool addresses for testing
  // USDT/WBNB 0.05% pool
  USDT_WBNB_500: '0x36696169C63e42cd08ce11f5deeBbCeBae652050',
  
  // USDC/USDT 0.01% pool  
  USDC_USDT_100: '0x92b7807bF19b7DDdf89b706143896d05228f3121',
  
  // WBNB/BUSD 0.05% pool
  WBNB_BUSD_500: '0x133B3D95bAD5405d14d53473671200e9342896BF',
};

export const DEFAULT_RPC_URLS = {
  BSC_MAINNET: 'https://bsc-dataseed.binance.org/',
  BSC_TESTNET: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  
  // Backup RPC endpoints
  BSC_MAINNET_BACKUP: [
    'https://bsc-dataseed1.defibit.io/',
    'https://bsc-dataseed1.ninicoin.io/',
    'https://bsc.nodereal.io',
  ],
};

/**
 * Get default Multicall3 address for BSC
 */
export function getMulticall3Address(): string {
  return BSC_ADDRESSES.MULTICALL3;
}

/**
 * Get default RPC URL for BSC mainnet
 */
export function getDefaultRpcUrl(): string {
  return DEFAULT_RPC_URLS.BSC_MAINNET;
}

