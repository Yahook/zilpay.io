export interface Wallet {
  base16: string;
  bech32: string;
}

export type WalletType = 'zilpay' | 'evm';

export interface ConnectedWalletInfo {
  type: WalletType;
  address: string;
  wallet: Wallet | null;
  evmAddress?: string;
}
