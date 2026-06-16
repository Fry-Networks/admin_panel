/**
 * Pool Funding Client — transaction builder for FryMinerRewardPool funding.
 *
 * Dual-path:
 *   - tFRY / fNODE  → fund_pool(axfer) — contract-validated
 *   - arbitrary ASA  → opt_in_assets + direct AssetTransferTxn — bypasses fund_pool
 *
 * Uses AtomicTransactionComposer + ABIMethod for ABI-safe encoding.
 * Selectors verified against on-chain TEAL (approval program line 89).
 */

import algosdk from 'algosdk';
import { sha512_256 } from 'js-sha512';

// ── Constants ──────────────────────────────────────────────────────────

export const POOL_APP_ID = 3592975326;
export const TFRY_ID = 2681521901;
export const FNODE_ID = 2485202024;

export const POOL_APP_ADDRESS = algosdk.getApplicationAddress(POOL_APP_ID);

// MBR for a single ASA opt-in (same-asset-twice: 1 real opt-in + 1 no-op)
const OPT_IN_MBR = 100_000;

// ── ABI Method Definitions (from ARC56 artifact) ──────────────────────

const OPT_IN_METHOD = new algosdk.ABIMethod({
  name: 'opt_in_assets',
  args: [
    { type: 'uint64', name: 'tfry' },
    { type: 'uint64', name: 'fnode' },
    { type: 'pay', name: 'mbr_pay' },
  ],
  returns: { type: 'void' },
});

const FUND_POOL_METHOD = new algosdk.ABIMethod({
  name: 'fund_pool',
  args: [{ type: 'axfer', name: 'axfer' }],
  returns: { type: 'void' },
});

// ── Selector Assertions ───────────────────────────────────────────────

function computeSelector(sig: string): Uint8Array {
  return new Uint8Array(sha512_256.array(new TextEncoder().encode(sig)).slice(0, 4));
}

function hexBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify selectors match TEAL-verified values at module load
const optInSel = computeSelector('opt_in_assets(uint64,uint64,pay)void');
const fundPoolSel = computeSelector('fund_pool(axfer)void');

if (hexBytes(optInSel) !== '5cf3b636') {
  throw new Error(
    `opt_in_assets selector mismatch: got ${hexBytes(optInSel)}, expected 5cf3b636`
  );
}
if (hexBytes(fundPoolSel) !== '87c3778f') {
  throw new Error(
    `fund_pool selector mismatch: got ${hexBytes(fundPoolSel)}, expected 87c3778f`
  );
}

// ── Types ─────────────────────────────────────────────────────────────

export interface PoolAsset {
  id: number;
  balance: string;
  decimals: number;
  name: string;
  unitName: string;
}

export interface PoolState {
  appId: number;
  appAddress: string;
  algo: number;
  assets: PoolAsset[];
  optedInAssetIds: number[];
  admin: string;
  owner: string;
  currentEpoch: number;
  paused: boolean;
}

export interface AssetInfo {
  decimals: number;
  name: string;
  unitName: string;
  total: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Convert decimal amount string to micro-units via string manipulation (no float, no BigInt).
 * "1.5" with decimals=6 → "1500000"
 * Returns a string to avoid BigInt syntax issues with es5 target.
 */
export function decimalToMicro(amount: string, decimals: number): string {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '.') return '0';

  const parts = trimmed.split('.');
  const whole = parts[0] || '0';
  let frac = parts[1] || '';

  // Pad or truncate fractional part to match decimals
  if (frac.length > decimals) {
    frac = frac.slice(0, decimals);
  } else {
    frac = frac.padEnd(decimals, '0');
  }

  // Concatenate and strip leading zeros (but keep at least one digit)
  const raw = whole + frac;
  const stripped = raw.replace(/^0+/, '') || '0';
  return stripped;
}

/**
 * Parse micro-unit string to number for algosdk (safe for amounts < 2^53).
 */
export function microToNumber(micro: string): number {
  const n = Number(micro);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Amount ${micro} exceeds safe integer range`);
  }
  return n;
}

/**
 * Wrap useWallet().signTransactions as an algosdk TransactionSigner.
 */
export function makePeraSigner(
  signTransactions: (txns: Uint8Array[]) => Promise<(Uint8Array | null)[]>
): algosdk.TransactionSigner {
  return async (
    txnGroup: algosdk.Transaction[],
    indexes: number[]
  ): Promise<Uint8Array[]> => {
    const encoded = txnGroup.map((t) => algosdk.encodeUnsignedTransaction(t));
    const signed = await signTransactions(encoded);
    return indexes.map((i) => {
      const s = signed[i];
      if (!s) throw new Error(`Transaction at index ${i} was not signed`);
      return s;
    });
  };
}

/**
 * Create an Algodv2 client pointing at the admin panel's algod proxy.
 */
export function makeAlgodClient(): algosdk.Algodv2 {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/algod`
      : 'http://localhost:3008/api/algod';
  return new algosdk.Algodv2('', base, '');
}

// ── Data Fetching ─────────────────────────────────────────────────────

const baseUrl = () =>
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';

export async function fetchPoolState(): Promise<PoolState> {
  const res = await fetch(`${baseUrl()}/api/pool/fund-status`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`fund-status failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAssetInfo(assetId: number): Promise<AssetInfo> {
  const res = await fetch(`${baseUrl()}/api/algod/v2/assets/${assetId}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Asset ${assetId} lookup failed: ${res.status}`);
  }
  const data = await res.json();
  const params = data.params || data.asset?.params || {};
  return {
    decimals: params.decimals ?? 0,
    name: params.name ?? `ASA #${assetId}`,
    unitName: params['unit-name'] ?? '',
    total: String(params.total ?? 0),
  };
}

// ── Transaction Builders ──────────────────────────────────────────────

/**
 * Opt the pool into a new ASA.
 * Same-asset-twice: passes assetId as both args → 1 real opt-in + 1 no-op.
 * MBR payment covers one opt-in (100K µALGO).
 * Fee budget: pay at 3000 + appcall at 1000 = 4000, covers 2 fee-0 inner txns.
 */
export async function executeOptIn(
  sender: string,
  assetId: number,
  signer: algosdk.TransactionSigner,
  algodClient: algosdk.Algodv2
): Promise<string> {
  const sp = await algodClient.getTransactionParams().do();

  // MBR payment with extra fee to cover 2 inner opt-in txns
  const mbrSp = { ...sp, fee: 3000, flatFee: true };
  const mbrPay = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: POOL_APP_ADDRESS,
    amount: OPT_IN_MBR,
    suggestedParams: mbrSp,
  });

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    appID: POOL_APP_ID,
    method: OPT_IN_METHOD,
    methodArgs: [assetId, assetId, { txn: mbrPay, signer }],
    appForeignAssets: [assetId],
    sender,
    suggestedParams: sp,
    signer,
  });

  const result = await atc.execute(algodClient, 8);
  return result.txIDs[result.txIDs.length - 1];
}

/**
 * Fund pool with tFRY or fNODE via the contract-validated fund_pool(axfer).
 * Only accepts assets matching self.tfry_id or self.fnode_id on-chain.
 */
export async function executeFundPool(
  sender: string,
  assetId: number,
  microAmount: number,
  signer: algosdk.TransactionSigner,
  algodClient: algosdk.Algodv2
): Promise<string> {
  const sp = await algodClient.getTransactionParams().do();

  const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: POOL_APP_ADDRESS,
    amount: microAmount,
    assetIndex: assetId,
    suggestedParams: sp,
  });

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    appID: POOL_APP_ID,
    method: FUND_POOL_METHOD,
    methodArgs: [{ txn: axfer, signer }],
    appForeignAssets: [assetId],
    sender,
    suggestedParams: sp,
    signer,
  });

  const result = await atc.execute(algodClient, 8);
  return result.txIDs[result.txIDs.length - 1];
}

/**
 * Fund pool with an arbitrary ASA via direct AssetTransferTxn.
 * Bypasses fund_pool validation — use only for non-tFRY/fNODE assets
 * that the pool is already opted into.
 */
export async function executeDirectTransfer(
  sender: string,
  assetId: number,
  microAmount: number,
  signer: algosdk.TransactionSigner,
  algodClient: algosdk.Algodv2
): Promise<string> {
  const sp = await algodClient.getTransactionParams().do();

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: POOL_APP_ADDRESS,
    amount: microAmount,
    assetIndex: assetId,
    suggestedParams: sp,
  });

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addTransaction({ txn, signer });
  const result = await atc.execute(algodClient, 8);
  return result.txIDs[0];
}

/**
 * Whether this asset uses the contract-validated fund_pool path.
 */
export function isPoolAsset(assetId: number): boolean {
  return assetId === TFRY_ID || assetId === FNODE_ID;
}
