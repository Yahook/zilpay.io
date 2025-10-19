// config/bridge.ts
export const DEBRIDGE_WIDGET_ELEMENT_ID = 'debridgeWidget';
export const DEBRIDGE_SCRIPT_SRC =
  'https://app.debridge.finance/assets/scripts/widget.js';

// Адрес для комиссий ZilPay:
export const AFFILIATE_EVM_RECIPIENT =
  '0x36e1330847b5a8362ee11921637E92bA83249742' as const;

// 0.1 означает 0.1% у deBridge (макс. 10 = 10%)
export const AFFILIATE_DEFAULT_PERCENT = 0.1;

export const STAKING_MIN_ZIL = 20_000;

// Названия пулов — используем в тексте.
export const STAKING_POOLS_UI = ['AmazingPool', '2ZilMoon'] as const;

// Пулы и порог для льготы (старые id оставляем как есть — не рендерим в UI)
export const STAKING_POOLS_IDS: readonly string[] = [
  '12d3koowgpqvxezuсpakbkhjbzakqahgzhpwjv5hr1cxc4dj4yhd',
  '12d3koown4b9xwozulkgzct4xmclmwtnhju94xf9janfouescwhj'
];

// referral code в deBridge
export const REFERRAL_CODE = 32608;

// EVM RPC
export const ZIL_EVM_RPC = 'https://ssn.zilpay.io/api' as const;

// Делегационные прокси (EVM) для eligibility
export const ELIGIBILITY_POOLS = [
  {
    name: 'Amazing Pool',
    proxy: '0x1f0e86Bc299Cc66df2e5512a7786C3F528C0b5b6', // delegation proxy
  },
  {
    name: '2ZilMoon',
    proxy: '0xCDb0B23Db1439b28689844FD093C478d73C0786A',
  },
] as const;

// ---- chainId для используемых сетей ----
export const CHAIN = {
  ETH: 1,
  BSC: 56,
  POLYGON: 137,
  FANTOM: 250,
  ZIL_EVM: 32769 // Zilliqa EVM (0x8001)
} as const;

// ---- минимальный whitelist сетей + Zilliqa EVM ----
export const SUPPORTED_CHAINS_MIN = {
  inputChains: {
    1: 'all',        // Ethereum
    10: 'all',       // Optimism
    56: 'all',       // BNB Chain
    137: 'all',      // Polygon
    42161: 'all',    // Arbitrum
    43114: 'all',    // Avalanche
    8453: 'all',     // Base
    59144: 'all',    // Linea
    80094: 'all',    // Hyperliquid (если видишь в списке)
    32769: 'all',    // Zilliqa EVM
  },
  outputChains: {
    1: 'all',
    10: 'all',
    56: 'all',
    137: 'all',
    42161: 'all',
    43114: 'all',
    8453: 'all',
    59144: 'all',
    80094: 'all',
    32769: 'all',    // Zilliqa EVM
  },
} as const;

export const WIDGET_DEFAULTS = {
  v: '1',
  element: DEBRIDGE_WIDGET_ELEMENT_ID,
  mode: 'deswap',
  theme: 'dark',
  lang: 'en',
  width: '100%',
  height: 780,

  // ZIL дефолтом на выходе
  outputChain: 32769,

  // Явно разрешаем ZIL + текущие дефолтные сети
  supportedChains: SUPPORTED_CHAINS_MIN,
} as const;

export const ZQ2 = {
  RPC: 'https://ssn.zilpay.io/api',
  CHAIN_ID: 32769, // Zilliqa EVM
  POOLS: {
    AMAZING: {
      name: 'Amazing Pool',
      variant: 'liquid' as const,
      proxy: '0x1f0e86Bc299Cc66df2e5512a7786C3F528C0b5b6', // delegation proxy
    },
    ZILMOON: {
      name: '2ZilMoon',
      variant: 'non-liquid' as const,
      proxy: '0xCDb0B23Db1439b28689844FD093C478d73C0786A', // delegation proxy
    },
  },
} as const;