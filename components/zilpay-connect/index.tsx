import styles from './index.module.scss';

import type { Wallet } from '@/types/wallet';

import React from "react";
import { useStore } from 'react-stores';

import { AccountModal } from '@/components/modals/account/index';
import { WalletSelectorModal, WalletOption } from '@/components/modals/wallet-selector/index';
import { ThreeDots } from 'react-loader-spinner';

import { $wallet } from '@/store/wallet';
import { $connectedWallet, resetConnectedWallet } from '@/store/connected-wallet';
import { $transactions, updateTransactions } from '@/store/transactions';
import { $net } from '@/store/netwrok';

import { Blockchain } from '@/mixins/custom-fetch';
import { ZilPayBase } from '@/mixins/zilpay-base';
import { trim } from '@/lib/trim';
import { DragonDex } from '@/mixins/dex';
import { discoverProvidersOnce, EIP6963ProviderDetail } from '@/lib/eip6963';

const chainFetcher = new Blockchain();
const zilPayWallet = new ZilPayBase();
const dex = new DragonDex();

let observer: any = null;
let observerNet: any = null;
let observerBlock: any = null;

export const ConnectZIlPay: React.FC = function () {
  const wallet = useStore($wallet);
  const connectedWallet = useStore($connectedWallet);
  const transactionsStore = useStore($transactions);

  const [accountModal, setAccountModal] = React.useState(false);
  const [walletSelectorModal, setWalletSelectorModal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [discoveringWallets, setDiscoveringWallets] = React.useState(false);
  const [availableWallets, setAvailableWallets] = React.useState<WalletOption[]>([]);

  const isLoading = React.useMemo(() => {
    const { transactions } = transactionsStore;

    if (transactions.length === 0) {
      return true;
    }
    
    return transactions.filter((tx) => !tx.confirmed).length === 0;
  }, [transactionsStore]);

  const transactionsCheck = async() => {
    let { transactions } = $transactions.state;

    const params = transactions
      .filter((tx) => !tx.confirmed)
      .map((tx) => tx.hash);

    if (params.length === 0) {
      return null;
    }

    const resList = await chainFetcher.getTransaction(...params);

    for (let index = 0; index < transactions.length; index++) {
      try {
        const tx = transactions[index];
        const found = resList.find((res) => res.result.ID === tx.hash);

        if (!found) {
          continue;
        }

        transactions[index].confirmed = true;
        transactions[index].error = !found.result.receipt.success;
      } catch {
      }
    }

    updateTransactions(String($wallet.state?.bech32), transactions);
  };

  const hanldeObserverState = React.useCallback(
    (zp: any) => {
      $net.setState({
        net: zp.wallet.net
      });

      if (observerNet) {
        observerNet.unsubscribe();
      }
      if (observer) {
        observer.unsubscribe();
      }
      if (observerBlock) {
        observerBlock.unsubscribe();
      }

      observerNet = zp.wallet.observableNetwork().subscribe((net: string) => {
        $net.setState({
          net
        });
        dex.updateTokens();
      });

      observer = zp.wallet.observableAccount().subscribe((acc: Wallet) => {
        const address = $wallet.state;

        if (address?.base16 !== acc.base16) {
          $wallet.setState(acc);
        }

        $transactions.resetState();

        const cache = window.localStorage.getItem(
          String(acc.bech32)
        );

        if (cache) {
          $transactions.setState(JSON.parse(cache));
        }

        dex.updateTokens();
      });

      observerBlock = zp.wallet
        .observableBlock()
        .subscribe(() => {
          transactionsCheck();
          dex.updateTokens();
          dex.updateState();
        });

      if (zp.wallet.defaultAccount) {
        $wallet.setState(zp.wallet.defaultAccount);
      }

      const cache = window.localStorage.getItem(
        String(zp.wallet.defaultAccount?.bech32),
      );

      if (cache) {
        $transactions.setState(JSON.parse(cache));
      }

      transactionsCheck();
    },
    [],
  );

  const handleConnectZilPay = async() => {
    try {
      const zp = await zilPayWallet.zilpay();
      const connected = await zp.wallet.connect();

      if (connected && zp.wallet.defaultAccount) {
        $wallet.setState(zp.wallet.defaultAccount);
        $connectedWallet.setState({
          type: 'zilpay',
          address: zp.wallet.defaultAccount.base16
        });
        
        window.localStorage.setItem('wallet_type', 'zilpay');
        window.localStorage.removeItem('evm_address');
        window.localStorage.removeItem('wallet_disconnected');
      }

      $net.setState({
        net: zp.wallet.net
      });

      const cache = window.localStorage.getItem(
        String(zp.wallet.defaultAccount?.base16),
      );

      if (cache) {
        $transactions.setState(JSON.parse(cache));
      }
    } catch (err) {
      console.warn('Failed to connect ZilPay:', err);
      throw err;
    }
  };

  const handleConnectEVM = async(detail: EIP6963ProviderDetail) => {
    try {
      const accounts = await detail.provider.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        
        $connectedWallet.setState({
          type: 'evm',
          provider: detail.provider,
          address: address
        });
        
        window.localStorage.setItem('wallet_type', 'evm');
        window.localStorage.setItem('evm_address', address);
        window.localStorage.removeItem('wallet_disconnected');

        if (detail.provider.on) {
          detail.provider.on('accountsChanged', (newAccounts: string[]) => {
            if (newAccounts && newAccounts.length > 0) {
              window.localStorage.setItem('evm_address', newAccounts[0]);
              $connectedWallet.setState({
                type: 'evm',
                provider: detail.provider,
                address: newAccounts[0]
              });
            } else {
              window.localStorage.removeItem('wallet_type');
              window.localStorage.removeItem('evm_address');
              resetConnectedWallet();
            }
          });

          detail.provider.on('chainChanged', () => {
            window.location.reload();
          });
        }
      }
    } catch (err) {
      console.warn('Failed to connect EVM wallet:', err);
      throw err;
    }
  };

  const discoverWallets = async() => {
    setDiscoveringWallets(true);
    const wallets: WalletOption[] = [];

    try {
      const zp = await zilPayWallet.zilpay();
      if (zp) {
        wallets.push({
          id: 'zilpay-legacy',
          name: 'ZilPay Extension',
          icon: '/icons/zilpay.svg',
          type: 'zilpay',
        });
      }
    } catch (err) {
    }

    try {
      const evmProviders = await discoverProvidersOnce(500);
      evmProviders.forEach((detail) => {
        wallets.push({
          id: detail.info.uuid,
          name: detail.info.name,
          icon: detail.info.icon,
          type: 'evm',
          detail: detail,
        });
      });
    } catch (err) {
      console.warn('Failed to discover EVM wallets:', err);
    }

    setAvailableWallets(wallets);
    setDiscoveringWallets(false);
  };

  const handleConnect = async() => {
    setLoading(true);
    await discoverWallets();
    setWalletSelectorModal(true);
    setLoading(false);
  };

  const handleWalletSelect = async(walletOption: WalletOption) => {
    setLoading(true);
    
    try {
      if (walletOption.type === 'zilpay') {
        await handleConnectZilPay();
      } else if (walletOption.type === 'evm' && walletOption.detail) {
        await handleConnectEVM(walletOption.detail);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }

    setLoading(false);
  };

  const getDisplayAddress = (): string => {
    if (connectedWallet?.type === 'evm' && connectedWallet.address) {
      return trim(connectedWallet.address) || '';
    }
    if (wallet?.bech32) {
      return trim(wallet.bech32) || '';
    }
    return '';
  };

  React.useEffect(() => {
    const tryRestoreEVMSession = async () => {
      const isDisconnected = window.localStorage.getItem('wallet_disconnected');
      
      if (isDisconnected === 'true') {
        setLoading(false);
        return;
      }
      
      const savedWalletType = window.localStorage.getItem('wallet_type');
      
      if (savedWalletType === 'evm') {
        const savedAddress = window.localStorage.getItem('evm_address');
        if (savedAddress) {
          setLoading(true);
          const evmProviders = await discoverProvidersOnce(500);
          
          for (const detail of evmProviders) {
            try {
              const accounts = await detail.provider.request({
                method: 'eth_accounts',
              }) as string[];
              
              if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                $connectedWallet.setState({
                  type: 'evm',
                  provider: detail.provider,
                  address: accounts[0]
                });
                
                if (detail.provider.on) {
                  detail.provider.on('accountsChanged', (newAccounts: string[]) => {
                    if (newAccounts && newAccounts.length > 0) {
                      window.localStorage.setItem('evm_address', newAccounts[0]);
                      $connectedWallet.setState({
                        type: 'evm',
                        provider: detail.provider,
                        address: newAccounts[0]
                      });
                    } else {
                      window.localStorage.removeItem('wallet_type');
                      window.localStorage.removeItem('evm_address');
                      resetConnectedWallet();
                    }
                  });

                  detail.provider.on('chainChanged', () => {
                    window.location.reload();
                  });
                }
                
                setLoading(false);
                return;
              }
            } catch (err) {
            }
          }
        }
      }
      
      zilPayWallet
        .zilpay()
        .then((zp) => {
          hanldeObserverState(zp);
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
        });
    };

    tryRestoreEVMSession();

    return () => {
      if (observer) {
        observer.unsubscribe();
      }
      if (observerNet) {
        observerNet.unsubscribe();
      }
      if (observerBlock) {
        observerBlock.unsubscribe();
      }
    };
  }, [hanldeObserverState]);

  const isConnected = wallet || (connectedWallet?.type === 'evm' && connectedWallet?.address);
  const displayAddress = getDisplayAddress();

  return (
    <>
      <AccountModal
        show={accountModal}
        address={wallet}
        onClose={() => setAccountModal(false)}
      />
      <WalletSelectorModal
        show={walletSelectorModal}
        wallets={availableWallets}
        loading={discoveringWallets}
        onSelect={handleWalletSelect}
        onClose={() => setWalletSelectorModal(false)}
      />
      {isConnected && displayAddress ? (
        <button
          className={styles.connect}
          onClick={() => setAccountModal(true)}
        >
          {isLoading ? (
            displayAddress
          ) : (
            <>
              <b>
                Pending 
              </b>
              <ThreeDots
                color="var(--text-color)"
                height={10}
                width={15}
              />
            </>
          )}
        </button>
      ) : (
        <button
        className={styles.connect}
          onClick={handleConnect}
        >
          {loading ? (
            <ThreeDots
              color="var(--text-color)"
              height={10}
              width={20}
            />
          ) : (
            `Connect`
          )}
        </button>
      )}
    </>
  );
};
