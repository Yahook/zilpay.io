// components/bridge/BridgeWidget.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from 'react-stores';
import {
  AFFILIATE_DEFAULT_PERCENT,
  AFFILIATE_EVM_RECIPIENT,
  DEBRIDGE_SCRIPT_SRC,
  REFERRAL_CODE,
  WIDGET_DEFAULTS,
  DEBRIDGE_WIDGET_ELEMENT_ID,
} from '../../config/bridge';
import { isEligibleForZeroFee } from '../../lib/staking';
import { $wallet } from '../../store/wallet';
import { $connectedWallet } from '../../store/connected-wallet';

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

export type BridgeWidgetProps = { 
  className?: string;
  onAffiliateFeeChange?: (percent: number) => void;
};

// Helper to convert Zilliqa base16 to EVM format
function zilToEvmAddress(base16?: string): `0x${string}` | null {
  if (!base16) return null;
  // If already has 0x prefix
  if (base16.toLowerCase().startsWith('0x')) {
    return base16 as `0x${string}`;
  }
  // Add 0x prefix
  return `0x${base16}` as `0x${string}`;
}

export function BridgeWidget({ className, onAffiliateFeeChange }: BridgeWidgetProps) {
  const wallet = useStore($wallet);
  const connectedWallet = useStore($connectedWallet);
  const widgetRef = useRef<DeBridgeWidget | null>(null);
  const initializedRef = useRef(false);
  const lastAddressRef = useRef<string | null>(null);

  // Get current user address
  const getUserAddress = useCallback((): `0x${string}` | null => {
    // Priority: EVM wallet > ZilPay wallet
    if (connectedWallet?.type === 'evm' && connectedWallet.address) {
      return connectedWallet.address as `0x${string}`;
    }
    if (wallet?.base16) {
      return zilToEvmAddress(wallet.base16);
    }
    return null;
  }, [wallet, connectedWallet]);

  const checkAndSetFee = useCallback(async (widget: DeBridgeWidget, userAddress: `0x${string}` | null) => {
    let finalPercent = AFFILIATE_DEFAULT_PERCENT;

    if (userAddress) {
      try {
        console.debug('[BridgeWidget] checking staking eligibility for', userAddress);
        const { eligible, total } = await isEligibleForZeroFee(userAddress);
        
        if (eligible) {
          finalPercent = 0;
          widget.setAffiliateFee({
            evm: {
              affiliateFeePercent: '0',
              affiliateFeeRecipient: AFFILIATE_EVM_RECIPIENT,
            },
          });
          console.debug(`[BridgeWidget] eligible (≈ ${total.toFixed(2)} ZIL) → set 0%`);
        } else {
          widget.setAffiliateFee({
            evm: {
              affiliateFeePercent: String(AFFILIATE_DEFAULT_PERCENT),
              affiliateFeeRecipient: AFFILIATE_EVM_RECIPIENT,
            },
          });
          console.debug(`[BridgeWidget] not eligible (≈ ${total.toFixed(2)} ZIL) → keep ${AFFILIATE_DEFAULT_PERCENT}%`);
        }
      } catch (err) {
        console.warn('[BridgeWidget] eligibility check failed:', err);
        widget.setAffiliateFee({
          evm: {
            affiliateFeePercent: String(AFFILIATE_DEFAULT_PERCENT),
            affiliateFeeRecipient: AFFILIATE_EVM_RECIPIENT,
          },
        });
      }
    } else {
      // No wallet connected - use default
      widget.setAffiliateFee({
        evm: {
          affiliateFeePercent: String(AFFILIATE_DEFAULT_PERCENT),
          affiliateFeeRecipient: AFFILIATE_EVM_RECIPIENT,
        },
      });
      console.debug('[BridgeWidget] no wallet connected → keep default', AFFILIATE_DEFAULT_PERCENT);
    }

    // Notify parent component
    onAffiliateFeeChange?.(finalPercent);
  }, [onAffiliateFeeChange]);

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
      if (REFERRAL_CODE) params.r = String(REFERRAL_CODE);

      console.debug('[BridgeWidget] init widget with params:', params);
      const widget = await window.deBridge.widget(params);
      if (cancelled) {
        widget?.destroy?.();
        return;
      }

      widgetRef.current = widget;
      window.__ZP_DEBRIDGE_INIT__ = true;
      initializedRef.current = true;

      // Check fee based on current wallet
      const userAddress = getUserAddress();
      lastAddressRef.current = userAddress;
      await checkAndSetFee(widget, userAddress);

      widget.on('order', () => {});
      widget.on('bridge', () => {});
      console.debug('[BridgeWidget] widget ready');
    })().catch((e) => {
      console.error('[BridgeWidget] init error:', e);
    });

    return () => {
      cancelled = true;
    };
  }, [getUserAddress, checkAndSetFee]);

  // Watch for wallet changes and update fee
  useEffect(() => {
    const currentAddress = getUserAddress();
    
    // Only update if address actually changed
    if (currentAddress !== lastAddressRef.current && widgetRef.current && initializedRef.current) {
      console.debug('[BridgeWidget] wallet changed, updating fee:', lastAddressRef.current, '→', currentAddress);
      lastAddressRef.current = currentAddress;
      checkAndSetFee(widgetRef.current, currentAddress);
    }
  }, [wallet, connectedWallet, getUserAddress, checkAndSetFee]);

  return <div id={DEBRIDGE_WIDGET_ELEMENT_ID} className={className} style={{ minHeight: 780 }} />;
}

export default BridgeWidget;
