// scripts/check-eligibility.ts
import type { Address } from 'viem';
import { isAddress } from 'viem';
import { getStakedZilForAddress } from '../lib/staking';

const a = process.argv[2];
if (!a || !isAddress(a)) {
  console.error('Usage: bun run scripts/check-eligibility.ts <0xAddress>');
  process.exit(1);
}

(async () => {
  const res = await getStakedZilForAddress(a as Address);
  console.log('chainId:', res.chainId, '(expect 32769)');
  console.log('total ZIL:', res.total);
  for (const x of res.perPool) {
    console.log(` - ${x.pool}: ${x.stakedZil} ZIL (proxy ${x.proxy})`);
  }
})().catch(console.error);
