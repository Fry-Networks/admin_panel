import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

interface ByDayData {
  date: string;
  volumeUSDC: number;
  count: number;
}

interface IndexerData {
  totalVolumeUSDC: number;
  settlementCount: number;
  uniquePayers: number;
  byDay: ByDayData[];
}

interface FunnelData {
  since: string;
  perEndpoint: {
    fleet: { challenges: number; verified: number; settled: number };
    farm: { challenges: number; verified: number; settled: number };
    rewards: { challenges: number; verified: number; settled: number };
  };
  totals: { challenges: number; verified: number; settled: number };
}

interface CacheEntry {
  data: { indexer: IndexerData; funnel: FunnelData | null; cachedAt: string };
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60000; // 60 seconds

async function fetchNodelyData(): Promise<IndexerData> {
  // Dual-address: genesis (historical payTo) + treasury (current payTo after the 2026-07-17 flip).
  const payTos = (
    process.env.X402_PAYTOS ||
    'IQGTOUZJMRO6K54AHPLJYEUMTOVJTPMHZKABXFSRZ4PTPZPCSV37VPCLTA,E2F2LT2INE75DBOYHQXTCTOP2PAP5MHAXQRXTTCCXFKHQTVG36DJONBQZE'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const indexerBase = process.env.X402_INDEXER || 'https://mainnet-idx.4160.nodely.dev';
  const assetId = '31566704';

  // Collect USDC receipts across every payTo address (currency-greater-than=0 drops opt-ins server-side).
  let allTransactions: any[] = [];
  for (const payTo of payTos) {
    let nextToken: string | undefined;
    do {
      const url = `${indexerBase}/v2/assets/${assetId}/transactions?address=${payTo}&address-role=receiver&currency-greater-than=0&limit=100${
        nextToken ? `&next=${encodeURIComponent(nextToken)}` : ''
      }`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Nodely fetch failed: ${response.statusText}`);

      const data = await response.json();
      allTransactions = allTransactions.concat(data.transactions || []);
      nextToken = data['next-token'];
    } while (nextToken);
  }

  // Isolate x402 'exact' settlements: an atomic group (has group id) whose USDC axfer carries
  // fee===0 — fees are pooled onto the facilitator's fee-bump txn inside the group. This excludes
  // solo axfers (sweeps / manual transfers, fee>0) and non-x402 grouped flows (swaps / dust, fee>0),
  // and is verified equivalent to "facilitator fee-payer present in the group". Dedupe by tx id
  // (a payTo self-pay appears once; ids never overlap across addresses).
  const byDayMap: { [key: string]: { volumeUSDC: number; count: number } } = {};
  const payers = new Set<string>();
  const seen = new Set<string>();
  let totalVolume = 0;
  let settlementCount = 0;

  allTransactions.forEach((tx: any) => {
    const assetTx = tx['asset-transfer-transaction'];
    if (!assetTx || assetTx.amount === 0) return; // skip opt-ins / app-calls referencing USDC
    if (!tx.group || tx.fee !== 0) return; // x402 settlements only (atomic group + pooled fee)
    if (seen.has(tx.id)) return;
    seen.add(tx.id);

    const amount = assetTx.amount / 1e6; // µUSDC → USDC
    const sender = tx.sender; // outer sender = the x402 payer
    const roundTime = tx['round-time'];

    totalVolume += amount;
    settlementCount += 1;
    payers.add(sender);

    const date = new Date(roundTime * 1000).toISOString().split('T')[0];
    if (!byDayMap[date]) {
      byDayMap[date] = { volumeUSDC: 0, count: 0 };
    }
    byDayMap[date].volumeUSDC += amount;
    byDayMap[date].count += 1;
  });

  const byDay = Object.entries(byDayMap)
    .map(([date, data]) => ({
      date,
      volumeUSDC: parseFloat(data.volumeUSDC.toFixed(6)),
      count: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalVolumeUSDC: parseFloat(totalVolume.toFixed(6)),
    settlementCount,
    uniquePayers: payers.size,
    byDay
  };
}

async function fetchMetricsData(): Promise<FunnelData | null> {
  try {
    const metricsUrl = process.env.X402_METRICS_URL || 'https://fry.farm/x402/_metrics';
    const token = process.env.X402_METRICS_TOKEN;

    if (!token) {
      console.warn('X402_METRICS_TOKEN not set, metrics will be unavailable');
      return null;
    }

    const response = await fetch(metricsUrl, {
      headers: { 'X-Metrics-Token': token }
    });

    if (!response.ok) {
      console.warn(`Metrics fetch failed: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Error fetching metrics:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Auth guard
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin || !session.user.owner) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check cache
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cache.data);
    }

    // Fetch fresh data
    const [indexer, funnel] = await Promise.all([
      fetchNodelyData(),
      fetchMetricsData()
    ]);

    const response = {
      indexer,
      funnel,
      cachedAt: new Date().toISOString()
    };

    // Cache the result
    cache = { data: response, timestamp: now };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('x402-analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}
