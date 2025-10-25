import type { Tx } from 'types/zilliqa';

import { Store } from 'react-stores';
import { LIMIT } from '@/config/conts';

const initState: {
  transactions: Tx[]
} = {
  transactions: []
};

export const $transactions = new Store(initState);

export function addTransactions(payload: Tx) {
  const { transactions } = $transactions.state;
  const newState = [payload, ...transactions];

  if (newState.length >= LIMIT) {
    newState.pop();
  }

  $transactions.setState({
    transactions: newState
  });

  // Сохраняем транзакции под ключом адреса отправителя
  const storageKey = payload.from.startsWith('0x') ? payload.from.toLowerCase() : payload.from;
  window.localStorage.setItem(storageKey, JSON.stringify($transactions.state));
}

export function updateTransactions(from: string, transactions: Tx[]) {
  $transactions.setState({
    transactions
  });

  // Используем lowercase для EVM адресов
  const storageKey = from.startsWith('0x') ? from.toLowerCase() : from;
  window.localStorage.setItem(storageKey, JSON.stringify($transactions.state));
}

export function resetTransactions(from: string) {
  // Используем lowercase для EVM адресов
  const storageKey = from.startsWith('0x') ? from.toLowerCase() : from;
  window.localStorage.removeItem(storageKey);
  $transactions.resetState();
}