/** Fixed in-memory demo data for a single user, "Sam Smith". No persistence. */

export interface Account {
  id: string;
  name: string;
  currency: string;
  iban: string;
}

export interface Balance {
  accountId: string;
  currency: string;
  available: number;
  current: number;
}

export interface Transaction {
  id: string;
  bookingDate: string;
  description: string;
  amount: number;
  currency: string;
  direction: "debit" | "credit";
}

export const accounts: Account[] = [
  {
    id: "acc-001",
    name: "Sam Smith — Current",
    currency: "GBP",
    iban: "GB29 NWBK **** **** **** 1331",
  },
  {
    id: "acc-002",
    name: "Sam Smith — Savings",
    currency: "GBP",
    iban: "GB94 NWBK **** **** **** 7742",
  },
];

export const balances: Record<string, Balance> = {
  "acc-001": { accountId: "acc-001", currency: "GBP", available: 1842.55, current: 1902.55 },
  "acc-002": { accountId: "acc-002", currency: "GBP", available: 15320.0, current: 15320.0 },
};

export const transactions: Record<string, Transaction[]> = {
  "acc-001": [
    {
      id: "txn-1001",
      bookingDate: "2026-07-28",
      description: "Tesco Stores",
      amount: 42.17,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1002",
      bookingDate: "2026-07-27",
      description: "Salary — Acme Ltd",
      amount: 2450.0,
      currency: "GBP",
      direction: "credit",
    },
    {
      id: "txn-1003",
      bookingDate: "2026-07-26",
      description: "TfL Travel",
      amount: 6.5,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1004",
      bookingDate: "2026-07-25",
      description: "Pret A Manger",
      amount: 9.85,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1005",
      bookingDate: "2026-07-24",
      description: "Amazon UK",
      amount: 31.99,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1006",
      bookingDate: "2026-07-23",
      description: "Transfer to Savings",
      amount: 200.0,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1007",
      bookingDate: "2026-07-22",
      description: "British Gas",
      amount: 78.4,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1008",
      bookingDate: "2026-07-21",
      description: "Refund — ASOS",
      amount: 24.0,
      currency: "GBP",
      direction: "credit",
    },
    {
      id: "txn-1009",
      bookingDate: "2026-07-20",
      description: "Spotify",
      amount: 11.99,
      currency: "GBP",
      direction: "debit",
    },
    {
      id: "txn-1010",
      bookingDate: "2026-07-19",
      description: "Costa Coffee",
      amount: 4.15,
      currency: "GBP",
      direction: "debit",
    },
  ],
  "acc-002": [
    {
      id: "txn-2001",
      bookingDate: "2026-07-23",
      description: "Transfer from Current",
      amount: 200.0,
      currency: "GBP",
      direction: "credit",
    },
    {
      id: "txn-2002",
      bookingDate: "2026-06-23",
      description: "Interest",
      amount: 12.4,
      currency: "GBP",
      direction: "credit",
    },
  ],
};

export function findAccount(id: string): Account | undefined {
  return accounts.find((a) => a.id === id);
}
