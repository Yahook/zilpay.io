import styles from "./index.module.scss";

import React from "react";
import copy from "clipboard-copy";
import { Wallet } from '@/types/wallet';

import { useTranslation } from "next-i18next";

import { CopyIcon } from "components/icons/copy";
import { ViewIcon } from "components/icons/view";

import { trim } from "@/lib/trim";
import { viewAddress } from "@/lib/viewblock";
import { useStore } from "react-stores";
import { $net } from "@/store/netwrok";
import { $connectedWallet } from "@/store/connected-wallet";


type Prop = {
  wallet: Wallet | null;
};

export var AccountCard: React.FC<Prop> = function ({ wallet }) {
  const common = useTranslation(`common`);

  const { net } = useStore($net);
  const connectedWallet = useStore($connectedWallet);

  const isEVM = connectedWallet?.type === 'evm';
  const displayAddress = isEVM 
    ? (connectedWallet?.address || '') 
    : (wallet?.bech32 || '');
  const networkName = isEVM ? 'EVM Wallet' : net;

  return (
    <div className={styles.container}>
      <p>
        {common.t(`connected_via`)}
        {` `}
        {networkName}
        .
      </p>
      <h4>
        {displayAddress ? trim(displayAddress, 15) : ``}
      </h4>
      <div className={styles.row}>
        <div
          className={styles.copy}
          onClick={() => copy(displayAddress)}
        >
          <CopyIcon />
          <p>
            {common.t(`copy_adr`)}
          </p>
        </div>
        {!isEVM && (
          <a
            className={styles.second}
            href={wallet ? viewAddress(String(wallet?.bech32)) : ``}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ViewIcon />
            <p>
              {common.t(`view_explorer`)}
            </p>
          </a>
        )}
      </div>
    </div>
  );
};
