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
  const payTo = process.env.X402_PAYTO || 'IQGTOUZJMRO6K54AHPLJYEUMTOVJTPMHZKABXFSRZ4PTPZPCSV37VPCLTA';
  const indexerBase = process.env.X402_INDEXER || 'https://mainnet-idx.4160.nodely.dev';
  const assetId = '31566704';

  let allTransactions: any[] = [];
  let nextToken: string | undefined;

  // Paginate through all transactions
  do {
    const url = `${indexerBase}/v2/assets/${assetId}/transactions?address=${payTo}&address-role=receiver&limit=100${
      nextToken ? `&next=${encodeURIComponent(nextToken)}` : ''
    }`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Nodely fetch failed: ${response.statusText}`);

    const data = await response.json();
    allTransactions = allTransactions.concat(data.transactions || []);
    nextToken = data['next-token'];
  } while (nextToken);

  // Process transactions
  const byDayMap: { [key: string]: { volumeUSDC: number; count: number; payers: Set<string> } } = {};
  const payers = new Set<string>();
  let totalVolume = 0;

  allTransactions.forEach((tx: any) => {
    const assetTx = tx['asset-transfer-transaction'];
    if (!assetTx || assetTx.amount === 0) return; // Skip opt-ins

    const amount = assetTx.amount / 1e6; // Convert µUSDC to USDC
    const sender = assetTx.sender;
    const roundTime = tx['round-time'];

    totalVolume += amount;
    payers.add(sender);

    // Bucket by day (UTC)
    const date = new Date(roundTime * 1000).toISOString().split('T')[0];
    if (!byDayMap[date]) {
      byDayMap[date] = { volumeUSDC: 0, count: 0, payers: new Set() };
    }
    byDayMap[date].volumeUSDC += amount;
    byDayMap[date].count += 1;
    byDayMap[date].payers.add(sender);
  });

  const byDay = Object.entries(byDayMap)
    .map(([date, data]) => ({
      date,
      volumeUSDC: parseFloat(data.volumeUSDC.toFixed(2)),
      count: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalVolumeUSDC: parseFloat(totalVolume.toFixed(2)),
    settlementCount: allTransactions.length,
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
