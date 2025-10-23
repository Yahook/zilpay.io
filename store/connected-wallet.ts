import { Store } from 'react-stores';
import type { EIP1193Provider } from '@/lib/eip6963';

export interface ConnectedWallet {
  type: 'zilpay' | 'evm';
  provider?: EIP1193Provider;
  address?: string;
}

export const $connectedWallet = new Store<ConnectedWallet | null>(null);

export function resetConnectedWallet() {
  $connectedWallet.resetState();
}

