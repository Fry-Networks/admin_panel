import type { NextApiRequest, NextApiResponse } from 'next';

const ESCROW_WALLET = 'E2F2LT2INE75DBOYHQXTCTOP2PAP5MHAXQRXTTCCXFKHQTVG36DJONBQZE';
const FRY_2_0_ASA_ID = 2485314946;
const INDEXER_URL = 'http://mainnet-idx.algonode.cloud';

interface TransactionInfo {
  txId: string;
  date: string;
  amount: number;
  direction: 'In' | 'Out';
  counterparty: string;
  round: number;
}

interface DailyTotal {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

interface EscrowData {
  balance: number;
  formattedBalance: string;
  transactions: TransactionInfo[];
  dailyTotals: DailyTotal[];
  lastUpdated: string;
  status: 'healthy' | 'warning' | 'critical';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EscrowData | { error: string }>
) {
  try {
    // Fetch account info via REST (no algosdk dependency)
    const accountRes = await fetch(`${INDEXER_URL}/v2/accounts/${ESCROW_WALLET}`);
    if (!accountRes.ok) {
      throw new Error(`Indexer account lookup failed: ${accountRes.status}`);
    }
    const accountData = await accountRes.json();

    // Find FRY 2.0 balance
    const fryAsset = accountData.account?.assets?.find(
      (asset: any) => asset['asset-id'] === FRY_2_0_ASA_ID
    );

    const balanceMicrounits = Number(fryAsset?.amount || 0);
    const balance = balanceMicrounits / Math.pow(10, 6); // 6 decimals
    const formattedBalance = balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Fetch recent transactions via REST
    const txRes = await fetch(
      `${INDEXER_URL}/v2/accounts/${ESCROW_WALLET}/transactions?asset-id=${FRY_2_0_ASA_ID}&limit=50`
    );
    if (!txRes.ok) {
      throw new Error(`Indexer transactions lookup failed: ${txRes.status}`);
    }
    const txData = await txRes.json();

    // Process transactions and calculate daily totals
    const transactions: TransactionInfo[] = [];
    const dailyMap = new Map<string, { balance: number; inflow: number; outflow: number }>();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize last 30 days with zeros
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { balance: 0, inflow: 0, outflow: 0 });
    }

    // Current balance for trend calculation
    let runningBalance = balance;

    if (txData.transactions) {
      for (const tx of txData.transactions) {
        // Use round-time if available, fallback to epoch
        const roundTime = tx['round-time'];
        const txDate = roundTime ? new Date(roundTime * 1000) : new Date(0);
        const dateStr = txDate.toISOString().split('T')[0];

        if (!dailyMap.has(dateStr) && dateStr >= thirtyDaysAgo.toISOString().split('T')[0]) {
          dailyMap.set(dateStr, { balance: 0, inflow: 0, outflow: 0 });
        }

        // Determine direction and amount
        let amount = 0;
        let direction: 'In' | 'Out' = 'In';
        let counterparty = '';

        const assetTx = tx['asset-transfer-transaction'];
        if (assetTx) {
          amount = (Number(assetTx.amount) || 0) / Math.pow(10, 6);

          if (assetTx.receiver === ESCROW_WALLET) {
            direction = 'In';
            counterparty = tx.sender || '';
          } else {
            direction = 'Out';
            counterparty = assetTx.receiver || '';
          }
        }

        if (transactions.length < 20) {
          transactions.push({
            txId: tx.id || '',
            date: dateStr,
            amount,
            direction,
            counterparty,
            round: Number(tx['confirmed-round'] || 0)
          });
        }

        // Update daily totals
        if (dailyMap.has(dateStr)) {
          const daily = dailyMap.get(dateStr)!;
          if (direction === 'In') {
            daily.inflow += amount;
          } else {
            daily.outflow += amount;
          }
        }
      }
    }

    // Update daily balances (reverse iterate to calculate running balance)
    const dailyArray = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .reverse();

    let cumulativeBalance = runningBalance;
    dailyArray.forEach(([, data]) => {
      data.balance = cumulativeBalance;
      cumulativeBalance -= data.inflow - data.outflow;
    });

    const dailyTotals = dailyArray
      .reverse()
      .map(([date, data]) => ({
        date,
        balance: data.balance,
        inflow: data.inflow,
        outflow: data.outflow
      }));

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (balance < 100000) {
      status = 'critical';
    } else if (balance < 500000) {
      status = 'warning';
    }

    res.status(200).json({
      balance,
      formattedBalance,
      transactions,
      dailyTotals,
      lastUpdated: new Date().toISOString(),
      status
    });
  } catch (error) {
    console.error('Referral escrow error:', error);
    res.status(500).json({ error: 'Failed to fetch referral escrow data' });
  }
}
