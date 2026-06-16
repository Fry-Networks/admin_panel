import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  Callout,
  Badge,
  Flex,
  Divider,
  TextInput,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  RiWallet3Line,
  RiAlertLine,
  RiCheckboxCircleFill,
  RiLoader4Line,
  RiExternalLinkLine,
} from '@remixicon/react';
import { useWallet } from '../lib/use-wallet-compat';
import {
  fetchPoolState,
  fetchAssetInfo,
  decimalToMicro,
  microToNumber,
  makePeraSigner,
  makeAlgodClient,
  executeOptIn,
  executeFundPool,
  executeDirectTransfer,
  isPoolAsset,
  TFRY_ID,
  FNODE_ID,
  POOL_APP_ADDRESS,
  type PoolState,
  type AssetInfo,
} from '../lib/pool-funding-client';

type TxStatus =
  | { state: 'idle' }
  | { state: 'signing'; step: string }
  | { state: 'confirming'; step: string }
  | { state: 'success'; txId: string }
  | { state: 'error'; message: string };

const PRESETS = [
  { id: TFRY_ID, label: 'tFRY', unitName: 'tFRY' },
  { id: FNODE_ID, label: 'fNODE', unitName: 'fNODE' },
];

export default function PoolFunding() {
  const { activeAddress, signTransactions, providers } = useWallet();
  const peraProvider = providers.find((p) => p.metadata.id === 'pera');

  // Pool state
  const [pool, setPool] = useState<PoolState | null>(null);
  const [poolError, setPoolError] = useState<string>('');
  const [poolLoading, setPoolLoading] = useState(true);

  // Selected ASA
  const [selectedAsaId, setSelectedAsaId] = useState<string>(String(TFRY_ID));
  const [customAsaId, setCustomAsaId] = useState<string>('');
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [assetLookupError, setAssetLookupError] = useState<string>('');

  // Amount
  const [amount, setAmount] = useState<string>('');

  // Transaction
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: 'idle' });

  const effectiveAsaId =
    selectedAsaId === 'custom' ? Number(customAsaId) : Number(selectedAsaId);
  const isOptedIn =
    pool?.optedInAssetIds.includes(effectiveAsaId) ?? false;
  const isValidAsaId = Number.isInteger(effectiveAsaId) && effectiveAsaId > 0;
  const needsOptIn = isValidAsaId && !isOptedIn;
  const isContractPath = isPoolAsset(effectiveAsaId);

  // Wallet guard
  const isAdmin = !!pool && !!activeAddress && pool.admin === activeAddress;
  const isOwner = !!pool && !!activeAddress && pool.owner === activeAddress;
  const isAuthorized = isAdmin || isOwner;

  // ── Load pool state ─────────────────────────────────────────────────

  const loadPool = useCallback(async () => {
    setPoolLoading(true);
    setPoolError('');
    try {
      const state = await fetchPoolState();
      setPool(state);
    } catch (err: any) {
      setPoolError(err.message || 'Failed to load pool state');
    } finally {
      setPoolLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  // ── Look up asset info when ASA changes ─────────────────────────────

  useEffect(() => {
    if (!isValidAsaId) {
      setAssetInfo(null);
      setAssetLookupError('');
      return;
    }
    let cancelled = false;
    setAssetLookupError('');
    fetchAssetInfo(effectiveAsaId)
      .then((info) => {
        if (!cancelled) setAssetInfo(info);
      })
      .catch((err) => {
        if (!cancelled) {
          setAssetInfo(null);
          setAssetLookupError(err.message || 'Asset not found');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveAsaId, isValidAsaId]);

  // ── Micro-unit conversion ───────────────────────────────────────────

  const decimals = assetInfo?.decimals ?? 6;
  let microAmountStr = '0';
  let microAmountNum = 0;
  let conversionError = '';
  try {
    microAmountStr = decimalToMicro(amount, decimals);
    microAmountNum = microToNumber(microAmountStr);
  } catch (e: any) {
    conversionError = e.message || 'Invalid amount';
  }

  // ── Execute funding ─────────────────────────────────────────────────

  const handleFund = async () => {
    if (!activeAddress || !isValidAsaId || microAmountNum <= 0) return;

    const signer = makePeraSigner(signTransactions);
    const algodClient = makeAlgodClient();

    try {
      // Step 1: opt-in if needed
      if (needsOptIn) {
        setTxStatus({ state: 'signing', step: 'Opt-in' });
        const optInTxId = await executeOptIn(
          activeAddress,
          effectiveAsaId,
          signer,
          algodClient
        );
        setTxStatus({
          state: 'confirming',
          step: `Opt-in confirmed (${optInTxId.slice(0, 8)}...)`,
        });
        // Refresh pool state to confirm opt-in before proceeding
        await loadPool();
      }

      // Step 2: fund
      setTxStatus({ state: 'signing', step: 'Fund transfer' });
      let fundTxId: string;
      if (isContractPath) {
        fundTxId = await executeFundPool(
          activeAddress,
          effectiveAsaId,
          microAmountNum,
          signer,
          algodClient
        );
      } else {
        fundTxId = await executeDirectTransfer(
          activeAddress,
          effectiveAsaId,
          microAmountNum,
          signer,
          algodClient
        );
      }

      setTxStatus({ state: 'success', txId: fundTxId });
      setAmount('');
      await loadPool();
    } catch (err: any) {
      setTxStatus({
        state: 'error',
        message: err.message || 'Transaction failed',
      });
    }
  };

  // ── Connect wallet ──────────────────────────────────────────────────

  const handleConnect = async () => {
    if (peraProvider) {
      if (peraProvider.isConnected) {
        await peraProvider.disconnect();
      } else {
        await peraProvider.connect();
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const formatBalance = (balance: string, dec: number): string => {
    if (dec === 0) return balance;
    // String-based: pad balance to at least dec+1 chars, split at dec from right
    const padded = balance.padStart(dec + 1, '0');
    const whole = padded.slice(0, padded.length - dec) || '0';
    const frac = padded.slice(padded.length - dec).replace(/0+$/, '');
    return frac ? `${whole}.${frac}` : whole;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Title>Pool Funding</Title>
      <Text>Fund FryMinerRewardPool (App {pool?.appId ?? '...'})</Text>

      {/* ── Pool Status ─────────────────────────────────────────── */}
      <Card>
        <Flex justifyContent="between" alignItems="center">
          <Title className="text-base">Pool Status</Title>
          <Button
            size="xs"
            variant="secondary"
            onClick={loadPool}
            disabled={poolLoading}
          >
            Refresh
          </Button>
        </Flex>
        {poolLoading && <Text className="mt-2">Loading...</Text>}
        {poolError && (
          <Callout title="Error" color="red" className="mt-2">
            {poolError}
          </Callout>
        )}
        {pool && !poolLoading && (
          <div className="mt-3 space-y-1">
            <Text>
              <span className="text-gray-400">ALGO:</span>{' '}
              {(pool.algo / 1e6).toFixed(6)}
            </Text>
            {pool.assets.map((a) => (
              <Text key={a.id}>
                <span className="text-gray-400">
                  {a.unitName || a.name} ({a.id}):
                </span>{' '}
                {formatBalance(a.balance, a.decimals)}
              </Text>
            ))}
            <Divider />
            <Flex className="gap-2 flex-wrap">
              <Badge color="blue">Epoch {pool.currentEpoch}</Badge>
              {pool.paused && <Badge color="red">PAUSED</Badge>}
              {!pool.paused && <Badge color="green">Active</Badge>}
            </Flex>
          </div>
        )}
      </Card>

      {/* ── Wallet ──────────────────────────────────────────────── */}
      <Card>
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="text-base">Wallet</Title>
            {activeAddress ? (
              <Text className="text-xs font-mono mt-1">
                {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
              </Text>
            ) : (
              <Text className="mt-1 text-gray-500">Not connected</Text>
            )}
          </div>
          <Button
            size="xs"
            variant={activeAddress ? 'secondary' : 'primary'}
            icon={RiWallet3Line}
            onClick={handleConnect}
          >
            {activeAddress ? 'Disconnect' : 'Connect Pera'}
          </Button>
        </Flex>
        {activeAddress && pool && !isAuthorized && (
          <Callout
            title="Not authorized"
            icon={RiAlertLine}
            color="amber"
            className="mt-3"
          >
            Your connected wallet is not the pool admin or owner. Transactions
            will be rejected by the contract.
          </Callout>
        )}
        {activeAddress && pool && isAuthorized && (
          <Badge color="green" className="mt-2">
            {isOwner ? 'Owner' : 'Admin'}
          </Badge>
        )}
      </Card>

      {/* ── ASA Selection ──────────────────────────────────────── */}
      <Card>
        <Title className="text-base">Select Asset</Title>
        <div className="mt-3 space-y-3">
          <Select
            value={selectedAsaId}
            onValueChange={(v) => {
              setSelectedAsaId(v);
              setTxStatus({ state: 'idle' });
            }}
          >
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.label} ({p.id})
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom ASA ID...</SelectItem>
          </Select>

          {selectedAsaId === 'custom' && (
            <TextInput
              placeholder="Enter ASA ID"
              value={customAsaId}
              onValueChange={(v) => {
                setCustomAsaId(v.replace(/\D/g, ''));
                setTxStatus({ state: 'idle' });
              }}
            />
          )}

          {isValidAsaId && assetInfo && (
            <Flex className="gap-2 items-center">
              <Badge color="blue">
                {assetInfo.unitName || assetInfo.name}
              </Badge>
              <Text className="text-xs text-gray-400">
                {assetInfo.decimals} decimals
              </Text>
              {isOptedIn ? (
                <Badge color="green">Opted In</Badge>
              ) : (
                <Badge color="amber">Not Opted In</Badge>
              )}
            </Flex>
          )}

          {assetLookupError && (
            <Text className="text-red-400 text-sm">{assetLookupError}</Text>
          )}

          {/* Arbitrary-ASA warning */}
          {isValidAsaId && !isContractPath && assetInfo && (
            <Callout
              title="Bypass funding"
              icon={RiAlertLine}
              color="amber"
              className="text-sm"
            >
              Tokens funded outside fund_pool have no contract-level accounting.
              Owner can recover via withdraw_excess. This path bypasses contract
              validation.
            </Callout>
          )}
        </div>
      </Card>

      {/* ── Amount ─────────────────────────────────────────────── */}
      <Card>
        <Title className="text-base">Amount</Title>
        <div className="mt-3 space-y-2">
          <TextInput
            placeholder={`Amount in ${assetInfo?.unitName || 'tokens'}`}
            value={amount}
            onValueChange={(v) => {
              // Allow digits + one decimal point
              const filtered = v.replace(/[^0-9.]/g, '');
              const parts = filtered.split('.');
              setAmount(
                parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered
              );
              setTxStatus({ state: 'idle' });
            }}
          />
          {amount && !conversionError && (
            <Text className="text-xs text-gray-400">
              = {microAmountStr} micro-units
            </Text>
          )}
          {conversionError && (
            <Text className="text-red-400 text-sm">{conversionError}</Text>
          )}
        </div>
      </Card>

      {/* ── Fund Button ────────────────────────────────────────── */}
      <Card>
        {needsOptIn && (
          <Text className="text-amber-400 text-sm mb-2">
            Pool not opted into this ASA. Opt-in will be requested first (100K
            uALGO MBR).
          </Text>
        )}

        <Button
          size="lg"
          color="green"
          className="w-full"
          disabled={
            !activeAddress ||
            !isValidAsaId ||
            microAmountNum <= 0 ||
            !!conversionError ||
            txStatus.state === 'signing' ||
            txStatus.state === 'confirming' ||
            poolLoading
          }
          onClick={handleFund}
        >
          {txStatus.state === 'signing' || txStatus.state === 'confirming' ? (
            <Flex className="gap-2 items-center justify-center">
              <RiLoader4Line className="animate-spin h-4 w-4" />
              {txStatus.step}
            </Flex>
          ) : needsOptIn ? (
            'Opt In & Fund'
          ) : (
            'Fund Pool'
          )}
        </Button>

        {/* Transaction result */}
        {txStatus.state === 'success' && (
          <Callout
            title="Success"
            icon={RiCheckboxCircleFill}
            color="green"
            className="mt-3"
          >
            <Flex className="gap-1 items-center">
              <Text>TxID: {txStatus.txId.slice(0, 12)}...</Text>
              <a
                href={`https://allo.info/tx/${txStatus.txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                View <RiExternalLinkLine className="h-3 w-3" />
              </a>
            </Flex>
          </Callout>
        )}
        {txStatus.state === 'error' && (
          <Callout title="Error" color="red" className="mt-3">
            {txStatus.message}
          </Callout>
        )}
      </Card>
    </div>
  );
}
