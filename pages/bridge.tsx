// pages/bridge.tsx
import type { NextPage, GetStaticProps } from 'next';
import Head from 'next/head';
import { useState, useCallback } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import s from '../styles/Bridge.module.scss';
import { BridgeWidget } from '../components/bridge/BridgeWidget';
import {
  AFFILIATE_DEFAULT_PERCENT,
  STAKING_MIN_ZIL,
  STAKING_POOLS_UI,
} from '../config/bridge';

type BridgePageProps = Record<string, unknown>;

const formatPercent = (v: number) => `${Number.isInteger(v) ? v.toFixed(0) : String(v)}%`;

const BridgePage: NextPage<BridgePageProps> = () => {
  const [feePercent, setFeePercent] = useState<number>(AFFILIATE_DEFAULT_PERCENT);

  const handleFeeChange = useCallback((p: number) => {
    setFeePercent(p);
  }, []);

  return (
    <>
      <Head>
        <title>Bridge • ZilPay</title>
        <meta name="description" content="Cross-chain bridge powered by deBridge" />
      </Head>

      <main className={s.container}>
        <div className={s.header}>
          <h1 className={s.title}>Bridge</h1>
          <p className={s.sub}>Cross-chain swaps &amp; transfers via deBridge.</p>
        </div>

        <div className={s.grid}>
          <section className={s.widgetWrap}>
            <BridgeWidget onAffiliateFeeChange={handleFeeChange} />
          </section>

          <aside className={s.feeCard}>
            <h3 className={s.feeTitle}>💰 Fee Information</h3>

            <dl className={s.feeDef}>
              <div className={s.row}>
                <dt>Bridge fee</dt>
                <dd>
                  <p className={s.copy}>Standard deBridge network fees apply.</p>
                </dd>
              </div>

              <div className={s.row}>
                <dt>ZilPay fee</dt>
                <dd>
                  <p className={s.copy}>
                    <strong>0%</strong> if you stake at least <strong>{STAKING_MIN_ZIL.toLocaleString()} ZIL</strong> on{' '}
                    <strong>{STAKING_POOLS_UI[0]}</strong> or <strong>{STAKING_POOLS_UI[1]}</strong>.
                  </p>
                  <p className={s.copyMuted}>
                    Otherwise — <strong>{formatPercent(AFFILIATE_DEFAULT_PERCENT)}</strong> of the input amount.
                  </p>
                </dd>
              </div>
            </dl>

            <div className={s.yourFee}>
              <span className={s.yourFeeTitle}>Your ZilPay fee</span>
              <span className={s.badge}>{formatPercent(feePercent)}</span>
            </div>

            <p className={s.small}>Our fee helps support Zilliqa ecosystem development.</p>
          </aside>
        </div>
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps<BridgePageProps> = async ({ locale }) => {
  const namespaces = ['common'];
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', namespaces)),
    },
  };
};

export default BridgePage;
