export {}; // ensure module scope

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ImportMetaEnv {
  readonly VITE_ALCHEMY_KEY: string;
  readonly VITE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export type BalanceType = {
  decimals: number;
  formatted: string;
  symbol: string;
  value: bigint;
};
