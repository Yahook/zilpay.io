// Минимальные типы (из стандарта EIP-6963 + EIP-1193)
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<any>;
  on?(event: string, cb: (...args: any[]) => void): void;
  removeListener?(event: string, cb: (...args: any[]) => void): void;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

type AnnounceEvent = CustomEvent<{ info: EIP6963ProviderInfo; provider: EIP1193Provider }>;

export function listenEip6963(onFound: (d: EIP6963ProviderDetail) => void) {
  const handler = (e: Event) => {
    const ev = e as AnnounceEvent;
    if (ev.detail?.info && ev.detail?.provider) onFound(ev.detail);
  };
  window.addEventListener('eip6963:announceProvider', handler as EventListener, { passive: true });
  // Просим всех кошельков переобъявиться.
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  return () => window.removeEventListener('eip6963:announceProvider', handler as EventListener);
}

// Хелпер, чтобы один раз собрать всех за короткий таймаут
export async function discoverProvidersOnce(timeoutMs = 400): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    const found = new Map<string, EIP6963ProviderDetail>();
    const stop = listenEip6963((d) => { if (!found.has(d.info.uuid)) found.set(d.info.uuid, d); });
    setTimeout(() => { stop(); resolve([...found.values()]); }, timeoutMs);
  });
}
