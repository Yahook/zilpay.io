// lib/staking.ts
import {
  createPublicClient,
  http,
  erc20Abi,
  getAddress,
  type Address,
} from 'viem';
import Big from 'big.js';
import {
  ZIL_EVM_RPC,
  STAKING_MIN_ZIL,
  ELIGIBILITY_POOLS,
  CHAIN,
} from '../config/bridge';

// Настройки точности (можешь поправить при желании)
Big.DP = 40; // максимум знаков после запятой в промежуточных расчётах
Big.RM = 0;  // ROUND_DOWN

const client = createPublicClient({
  chain: {
    id: CHAIN.ZIL_EVM,
    name: 'Zilliqa EVM',
    nativeCurrency: { name: 'ZIL', symbol: 'ZIL', decimals: 18 },
    rpcUrls: { default: { http: [ZIL_EVM_RPC] } },
  },
  transport: http(ZIL_EVM_RPC),
});

// ---------- helpers ----------
const pow10 = (n: number) => Big(10).pow(n);

// bigint wei -> Big(decimal) по произвольным decimals
const fromUnits = (wei: bigint, decimals = 18): Big =>
  Big(wei.toString()).div(pow10(decimals));

// округляем для UI (не для сравнения порога!)
const toDisplay = (x: Big, dp = 6): number => Number(x.toFixed(dp));

// ---------- минимальные ABI ----------
const ABI_LIQ = [
  { type: 'function', name: 'getLST',   stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'lst',      stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'getPrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

const ABI_NONLIQ_GET_DELEGATED = [
  { type: 'function', name: 'getDelegatedAmount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

const ABI_NONLIQ_STAKED_OF = [
  { type: 'function', name: 'stakedOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// ---------- core ----------
/** LIQUID (AmazingPool): stakedZIL = balance(LST)*price */
async function readAmazingStakeBig(user: Address, proxy: Address): Promise<Big> {
  const lst =
    (await client.readContract({ address: proxy, abi: ABI_LIQ as any, functionName: 'getLST' }).catch(() => null)) ??
    (await client.readContract({ address: proxy, abi: ABI_LIQ as any, functionName: 'lst' }).catch(() => null));

  if (!lst || lst === '0x0000000000000000000000000000000000000000') {
    return Big(0);
  }

  const [priceRaw, balRaw, decRaw] = await Promise.all([
    client.readContract({ address: proxy,          abi: ABI_LIQ as any, functionName: 'getPrice' }) as Promise<bigint>,
    client.readContract({ address: lst as Address,  abi: erc20Abi,       functionName: 'balanceOf', args: [user] }) as Promise<bigint>,
    client.readContract({ address: lst as Address,  abi: erc20Abi,       functionName: 'decimals' }).catch(() => 18) as Promise<number>,
  ]);

  // price (ZIL per 1 LST) и баланс LST — оба как Big
  const price  = fromUnits(priceRaw, 18);                 // ZIL за 1 LST
  const balLST = fromUnits(balRaw, Number(decRaw ?? 18)); // LST у пользователя

  return balLST.times(price); // Big(ZIL)
}

/** NON-LIQUID (2ZilMoon): getDelegatedAmount() via msg.sender (=account) */
async function readZilMoonStakeBig(user: Address, proxy: Address): Promise<Big> {
  const val =
    await client.readContract({
      address: proxy,
      abi: ABI_NONLIQ_GET_DELEGATED as any,
      functionName: 'getDelegatedAmount',
      account: user, // ВАЖНО: это from в eth_call → msg.sender
    }).catch(async () => {
      // Фоллбек, если контракт ещё и stakedOf(address) поддерживает
      return client.readContract({
        address: proxy,
        abi: ABI_NONLIQ_STAKED_OF as any,
        functionName: 'stakedOf',
        args: [user],
      }).catch(() => 0n);
    });

  return fromUnits(val as bigint, 18); // Big(ZIL)
}

// ---------- public API ----------
export type PoolStake = { pool: string; proxy: Address; stakedZil: number };

export async function getStakedZilForAddress(
  user: Address
): Promise<{ total: number; perPool: PoolStake[]; chainId: number }> {
  const u = getAddress(user);
  const chainId = Number(await client.getChainId());

  const amazing = ELIGIBILITY_POOLS.find((p) => /amazing/i.test(p.name))!;
  const zilmoon = ELIGIBILITY_POOLS.find((p) => /zilmoon/i.test(p.name))!;

  const [bAmazing, bZilmoon] = await Promise.all([
    readAmazingStakeBig(u, getAddress(amazing.proxy as Address)),
    readZilMoonStakeBig(u, getAddress(zilmoon.proxy as Address)),
  ]);

  const totalBig = bAmazing.plus(bZilmoon);

  const perPool: PoolStake[] = [
    { pool: amazing.name, proxy: getAddress(amazing.proxy as Address), stakedZil: toDisplay(bAmazing) },
    { pool: zilmoon.name,  proxy: getAddress(zilmoon.proxy as Address),  stakedZil: toDisplay(bZilmoon) },
  ];

  return { total: toDisplay(totalBig), perPool, chainId };
}

export async function isEligibleForZeroFee(
  user: Address
): Promise<{ eligible: boolean; total: number }> {
  const u = getAddress(user);
  const amazing = ELIGIBILITY_POOLS.find((p) => /amazing/i.test(p.name))!;
  const zilmoon = ELIGIBILITY_POOLS.find((p) => /zilmoon/i.test(p.name))!;

  const [bAmazing, bZilmoon] = await Promise.all([
    readAmazingStakeBig(u, getAddress(amazing.proxy as Address)),
    readZilMoonStakeBig(u, getAddress(zilmoon.proxy as Address)),
  ]);

  const total = bAmazing.plus(bZilmoon);
  const threshold = Big(STAKING_MIN_ZIL); // 20000 ZIL в «человеческих» единицах

  return {
    eligible: total.gte(threshold),
    total: toDisplay(total), // только для отображения
  };
}
