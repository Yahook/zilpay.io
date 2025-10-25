import styles from "./index.module.scss";

import React from "react";
import { useStore } from "react-stores";
import { useTranslation } from "next-i18next";

import { Modal, ModalHeader } from "components/modal";
import { TxCard } from "components/tx-card";
import { $transactions, resetTransactions } from "store/transactions";
import { AccountCard } from "@/components/account-card";

import type { Wallet } from "@/types/wallet";
import { $wallet, resetWallet } from "@/store/wallet";
import { Toggle } from "@/components/toggle";
import { $settings, updateSettingsStore } from "@/store/settings";
import { Themes } from "@/config/themes";
import { $connectedWallet, resetConnectedWallet } from "@/store/connected-wallet";

type Prop = {
  show: boolean;
  address: Wallet | null;
  onClose: () => void;
};


export var AccountModal: React.FC<Prop> = function ({
  show,
  onClose,
  address
}) {
  const common = useTranslation(`common`);
  const { transactions } = useStore($transactions);
  const wallet = useStore($wallet);
  const settings = useStore($settings);
  const connectedWallet = useStore($connectedWallet);

  const hanldeChangeTheme = React.useCallback((value: boolean) => {
    if (value) {
      updateSettingsStore({
        ...settings,
        theme: Themes.Dark
      });
    } else {
      updateSettingsStore({
        ...settings,
        theme: Themes.Light
      });
    }
  }, [settings]);

  const handleDisconnect = React.useCallback(() => {
    window.localStorage.removeItem('wallet_type');
    window.localStorage.removeItem('evm_address');
    window.localStorage.setItem('wallet_disconnected', 'true');
    
    // Очищаем транзакции в зависимости от типа кошелька
    if (connectedWallet?.type === 'evm' && connectedWallet.address) {
      resetTransactions(connectedWallet.address);
    } else if (wallet) {
      resetTransactions(String(wallet?.bech32));
    }
    
    resetConnectedWallet();
    resetWallet();
    
    onClose();
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [connectedWallet, wallet, onClose]);

  return (
    <Modal
      show={show}
      title={(
        <ModalHeader onClose={onClose}>
          {common.t(`account`)}
        </ModalHeader>
      )}
      width="450px"
      onClose={onClose}
    >
      <AccountCard wallet={address} />
      <div className={styles.txlist}>
        <Toggle
          value={settings.theme === Themes.Dark}
          onToggle={hanldeChangeTheme}
        />
        {transactions.length === 0 ? (
          <p className={styles.here}>
            {common.t(`tx_appear_here`)}
          </p>
        ) : (
          <div>
            <div className={styles.header}>
              <p>
                {common.t(`recent_txns`)}
              </p>
              <p
                className={styles.clear}
                onClick={() => {
                  if (connectedWallet?.type === 'evm' && connectedWallet.address) {
                    resetTransactions(connectedWallet.address);
                  } else if (wallet) {
                    resetTransactions(String(wallet?.bech32));
                  }
                }}
              >
                (
                {common.t(`clear_all`)}
                )
              </p>
            </div>
            {transactions.map((tx) => (
              <TxCard key={tx.hash} tx={tx} />
            ))}
          </div>
        )}
        <button
          className={styles.disconnect}
          onClick={handleDisconnect}
        >
          Disconnect Wallet
        </button>
      </div>
    </Modal>
  );
};
