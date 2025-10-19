// components/bridge/BridgeWidget.tsx
import { useEffect, useRef } from 'react';
import {
  AFFILIATE_DEFAULT_PERCENT,
  AFFILIATE_EVM_RECIPIENT,
  DEBRIDGE_SCRIPT_SRC,
  REFERRAL_CODE,
  WIDGET_DEFAULTS,
  DEBRIDGE_WIDGET_ELEMENT_ID,
} from '../../config/bridge';
import { isEligibleForZeroFee } from '../../lib/staking';

type DeBridgeWidget = {
  on: (eventName: string, cb: (...args: unknown[]) => void) => void;
  setAffiliateFee: (cfg: {
    evm?: { affiliateFeePercent: string; affiliateFeeRecipient: string };
    solana?: { affiliateFeePercent: string; affiliateFeeRecipient: string };
  }) => void;
  destroy?: () => void;
};

declare global {
  interface Window {
    deBridge?: {
      widget: (params: Record<string, unknown>) => Promise<DeBridgeWidget>;
    };
    __ZP_DEBRIDGE_INIT__?: boolean;
  }
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if ((existing as any).dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.loaded = '0';
    s.onload = () => {
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ❗ временно хардкодим адрес пользователя
const HARDCODED_USER = '0x994747f596c2262Aeb855Ed34B52eaD98646a0Ac' as `0x${string}`;

export type BridgeWidgetProps = { className?: string };

export function BridgeWidget({ className }: BridgeWidgetProps) {
  const widgetRef = useRef<DeBridgeWidget | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined') return;

      if (window.__ZP_DEBRIDGE_INIT__) {
        console.debug('[BridgeWidget] already initialized — skip (StrictMode)');
        return;
      }

      const container = document.getElementById(DEBRIDGE_WIDGET_ELEMENT_ID);
      if (!container) {
        console.error('[BridgeWidget] container not found:', DEBRIDGE_WIDGET_ELEMENT_ID);
        return;
      }
      if (container.childElementCount > 0) {
        console.debug('[BridgeWidget] container already populated — skip');
        window.__ZP_DEBRIDGE_INIT__ = true;
        initializedRef.current = true;
        return;
      }

      console.debug('[BridgeWidget] loading script…', DEBRIDGE_SCRIPT_SRC);
      await loadScriptOnce(DEBRIDGE_SCRIPT_SRC);
      if (cancelled) return;

      if (!window.deBridge) {
        console.error('[BridgeWidget] window.deBridge is undefined — script blocked? CSP/HTTPS issue?');
        return;
      }

      const params: Record<string, unknown> = { ...WIDGET_DEFAULTS };
      if (REFERRAL_CODE) params.r = String(REFERRAL_CODE); // ← r как строка

      console.debug('[BridgeWidget] init widget with params:', params);
      const widget = await window.deBridge.widget(params);
      if (cancelled) {
        widget?.destroy?.();
        return;
      }

      widgetRef.current = widget;
      window.__ZP_DEBRIDGE_INIT__ = true;
      initializedRef.current = true;

      // 1) стартуем с 0.1% на наш адрес
      widget.setAffiliateFee({
        evm: {
          affiliateFeePercent: String(AFFILIATE_DEFAULT_PERCENT),
          affiliateFeeRecipient: AFFILIATE_EVM_RECIPIENT,
        },
      });

      // 2) проверяем стейк по RPC и, если нужно, переключаем на 0%
      try {
        console.debug('[BridgeWidget] checking staking eligibility for', HARDCODED_USER);
        const { eligible, total } = await isEligibleForZeroFee(HARDCODED_USER);
        if (eligible) {
          widget.setAffiliateFee({
            evm: {
              affiliateFeePercent: '0',
              affiliateFeeRecipient: AFFILIATE_EVM_RECIPIENT,
            },
          });
          console.debug(`[BridgeWidget] eligible (≈ ${total.toFixed(2)} ZIL) → set 0%`);
        } else {
          console.debug(`[BridgeWidget] not eligible (≈ ${total.toFixed(2)} ZIL) → keep ${AFFILIATE_DEFAULT_PERCENT}%`);
        }
      } catch (err) {
        console.warn('[BridgeWidget] eligibility check failed:', err);
      }

      widget.on('order', () => {});
      widget.on('bridge', () => {});
      console.debug('[BridgeWidget] widget ready');
    })().catch((e) => {
      console.error('[BridgeWidget] init error:', e);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <div id={DEBRIDGE_WIDGET_ELEMENT_ID} className={className} style={{ minHeight: 780 }} />;
}

export default BridgeWidget;
