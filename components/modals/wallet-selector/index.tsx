import styles from './index.module.scss';

import React from 'react';
import { ThreeDots } from 'react-loader-spinner';

import { Modal, ModalHeader } from '@/components/modal/index';
import type { EIP6963ProviderDetail } from '@/lib/eip6963';

type WalletType = 'zilpay' | 'evm';

export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  type: WalletType;
  detail?: EIP6963ProviderDetail;
}

type Props = {
  show: boolean;
  wallets: WalletOption[];
  loading?: boolean;
  onSelect: (wallet: WalletOption) => void;
  onClose: () => void;
};

export const WalletSelectorModal: React.FC<Props> = function ({
  show,
  wallets,
  loading = false,
  onSelect,
  onClose,
}) {
  const handleSelect = (wallet: WalletOption) => {
    onSelect(wallet);
    onClose();
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={<ModalHeader onClose={onClose}>Select Wallet</ModalHeader>}
    >
      {loading ? (
        <div className={styles.loading}>
          <ThreeDots
            color="var(--primary-color)"
            height={40}
            width={40}
          />
          <p>Discovering wallets...</p>
        </div>
      ) : wallets.length === 0 ? (
        <div className={styles.emptyState}>
          <h4>No wallets found</h4>
          <p>
            Please install a wallet extension to connect.
            <br />
            We support ZilPay for Zilliqa and any EIP-6963 compatible wallet for EVM.
          </p>
          <a
            href="https://zilpay.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get ZilPay
          </a>
        </div>
      ) : (
        <div className={styles.walletList}>
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className={styles.walletItem}
              onClick={() => handleSelect(wallet)}
            >
              <div className={styles.walletContent}>
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className={styles.walletIcon}
                />
                <div className={styles.walletInfo}>
                  <h4>{wallet.name}</h4>
                  {wallet.type === 'zilpay' && (
                    <p>Zilliqa Network</p>
                  )}
                  {wallet.type === 'evm' && wallet.detail && (
                    <p>{wallet.detail.info.rdns}</p>
                  )}
                </div>
              </div>
              {wallet.type === 'zilpay' && (
                <span className={styles.legacyBadge}>Legacy</span>
              )}
              {wallet.type === 'evm' && (
                <span className={styles.evmBadge}>EVM</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

