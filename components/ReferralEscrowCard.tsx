import {
  Card,
  Title,
  Metric,
  Text,
  Flex,
  Badge,
  AreaChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow
} from '@tremor/react';
import { useEffect, useState } from 'react';

interface Transaction {
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
  transactions: Transaction[];
  dailyTotals: DailyTotal[];
  lastUpdated: string;
  status: 'healthy' | 'warning' | 'critical';
}

export default function ReferralEscrowCard() {
  const [data, setData] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/referral-escrow');
        if (!response.ok) {
          throw new Error('Failed to fetch referral escrow data');
        }
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr || 'Unknown';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    if (status === 'critical') return 'red';
    if (status === 'warning') return 'amber';
    return 'emerald';
  };

  const getWeeklyData = () => {
    if (!data?.dailyTotals) return [];
    const weeklyMap = new Map<string, DailyTotal>();

    data.dailyTotals.forEach((daily) => {
      const date = new Date(daily.date);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          date: `W/o ${weekKey}`,
          balance: daily.balance,
          inflow: 0,
          outflow: 0
        });
      }
      const week = weeklyMap.get(weekKey)!;
      week.inflow += daily.inflow;
      week.outflow += daily.outflow;
      week.balance = daily.balance;
    });

    return Array.from(weeklyMap.values());
  };

  const chartData = chartView === 'daily' ? data?.dailyTotals || [] : getWeeklyData();

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <Text className="text-gray-400">Loading referral escrow data...</Text>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <Title className="text-white">Referral Escrow</Title>
        <Text className="text-red-400 mt-2">{error || 'Unable to load data'}</Text>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Title className="text-white">Referral Escrow</Title>
          <Text className="text-gray-400 text-sm mt-1">
            FRY 2.0 Wallet Balance
          </Text>
        </div>
        <Badge color={getStatusColor(data.status)} className="ml-4">
          {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </Badge>
      </Flex>

      <Metric className="text-white text-3xl mt-4">{data.formattedBalance}</Metric>

      {/* Trend Chart */}
      <div className="mt-6">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <Text className="text-white font-semibold">30-Day Balance Trend</Text>
          <div className="flex gap-2">
            <button
              onClick={() => setChartView('daily')}
              className={`px-3 py-1 rounded text-sm ${
                chartView === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartView('weekly')}
              className={`px-3 py-1 rounded text-sm ${
                chartView === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Weekly
            </button>
          </div>
        </Flex>

        <AreaChart
          data={chartData}
          index="date"
          categories={['balance']}
          colors={['blue']}
          showAnimation={false}
          className="h-64 mt-4"
          yAxisWidth={50}
          showGridLines={true}
          showLegend={false}
          showTooltip={true}
        />
      </div>

      {/* Recent Transactions */}
      <div className="mt-6">
        <Title className="text-white text-lg">Recent Transactions</Title>
        {data.transactions.length > 0 ? (
          <Table className="mt-4">
            <TableHead>
              <TableRow className="border-gray-700">
                <TableHeaderCell className="text-gray-400">Date</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Amount</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Type</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Counterparty</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">TX ID</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.transactions.slice(0, 10).map((tx, idx) => (
                <TableRow key={idx} className="border-gray-700">
                  <TableCell className="text-gray-300 text-sm">
                    {new Date(tx.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-gray-300 font-mono text-sm">
                    {tx.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={tx.direction === 'In' ? 'emerald' : 'amber'}
                      className="text-xs"
                    >
                      {tx.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 font-mono text-xs">
                    {truncateAddress(tx.counterparty)}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://allo.info/tx/${tx.txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                    >
                      {truncateAddress(tx.txId)}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Text className="text-gray-500 mt-4">No recent transactions</Text>
        )}
      </div>

      <Text className="text-gray-500 text-xs mt-4">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </Text>
    </Card>
  );
}
