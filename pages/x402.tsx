import { Card, Text, Title, Flex } from '@tremor/react';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';

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

interface AnalyticsData {
  indexer: IndexerData;
  funnel: FunnelData | null;
  cachedAt: string;
}

export default function X402Page() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session || !session.user.admin || !session.user.owner) {
        router.replace('/login');
      }
    })();
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/x402-analytics');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error fetching data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  const maxVolume = data?.indexer.byDay?.reduce((max, d) => Math.max(max, d.volumeUSDC), 0) || 0;
  const chartHeight = 200;
  const barWidth = Math.max(20, 500 / Math.max(data?.indexer.byDay?.length || 1, 1));

  return (
    <main className="p-4 md:p-10 mx-auto max-w-6xl bg-gray-950 min-h-screen">
      <Title className="text-white mb-8">x402 Volume Analytics</Title>

      {error && (
        <Card className="mb-6 bg-red-900 border-red-700">
          <Text className="text-red-200">Error: {error}</Text>
        </Card>
      )}

      {loading && !data ? (
        <Card className="bg-gray-900 border-gray-700">
          <Text className="text-gray-300">Loading...</Text>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <Text className="text-gray-400 text-sm">Total Volume (USDC)</Text>
              <Text className="text-white text-2xl font-bold mt-2">
                {data?.indexer.totalVolumeUSDC.toLocaleString() || 'N/A'}
              </Text>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <Text className="text-gray-400 text-sm">Settlements</Text>
              <Text className="text-white text-2xl font-bold mt-2">
                {data?.indexer.settlementCount || 0}
              </Text>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <Text className="text-gray-400 text-sm">Unique Payers</Text>
              <Text className="text-white text-2xl font-bold mt-2">
                {data?.indexer.uniquePayers || 0}
              </Text>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <Text className="text-gray-400 text-sm">Total Challenges</Text>
              <Text className="text-white text-2xl font-bold mt-2">
                {data?.funnel?.totals.challenges ?? 'N/A'}
              </Text>
            </Card>
          </div>

          {data?.indexer.byDay && data.indexer.byDay.length > 0 && (
            <Card className="mb-8 bg-gray-900 border-gray-700 p-6">
              <Text className="text-white font-semibold mb-4">Daily Volume (USDC)</Text>
              <svg
                width="100%"
                height={chartHeight}
                className="border border-gray-700 rounded bg-gray-800"
              >
                <text x="5" y="15" className="text-xs fill-gray-400">{maxVolume.toFixed(0)}</text>
                <text
                  x="5"
                  y={chartHeight / 2 + 5}
                  className="text-xs fill-gray-400"
                >
                  {(maxVolume / 2).toFixed(0)}
                </text>
                <text
                  x="5"
                  y={chartHeight - 5}
                  className="text-xs fill-gray-400"
                >
                  0
                </text>

                {data.indexer.byDay.map((day, i) => {
                  const barHeight = (day.volumeUSDC / maxVolume) * (chartHeight - 40);
                  const x = 30 + i * (barWidth + 2);
                  const y = chartHeight - barHeight - 20;
                  return (
                    <g key={day.date}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth - 2}
                        height={barHeight}
                        fill="#ef4444"
                        opacity="0.8"
                      />
                    </g>
                  );
                })}

                {data.indexer.byDay.map((day, i) => {
                  if (i % Math.ceil(data.indexer.byDay.length / 5) === 0) {
                    return (
                      <text
                        key={`label-${day.date}`}
                        x={30 + i * (barWidth + 2) + barWidth / 2}
                        y={chartHeight - 2}
                        textAnchor="middle"
                        className="text-xs fill-gray-400"
                      >
                        {day.date.slice(5)}
                      </text>
                    );
                  }
                  return null;
                })}
              </svg>
            </Card>
          )}

          <Card className="bg-gray-900 border-gray-700 p-6">
            <Text className="text-white font-semibold mb-4">Endpoint Funnel</Text>
            {data?.funnel ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-300">Endpoint</th>
                      <th className="text-right py-2 px-3 text-gray-300">Challenges</th>
                      <th className="text-right py-2 px-3 text-gray-300">Verified</th>
                      <th className="text-right py-2 px-3 text-gray-300">Settled</th>
                      <th className="text-right py-2 px-3 text-gray-300">Conversion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.funnel.perEndpoint).map(([endpoint, stats]) => {
                      const conversion =
                        stats.challenges > 0
                          ? ((stats.settled / stats.challenges) * 100).toFixed(1)
                          : '0.0';
                      return (
                        <tr key={endpoint} className="border-b border-gray-700 hover:bg-gray-800">
                          <td className="py-2 px-3 text-gray-200 capitalize">{endpoint}</td>
                          <td className="text-right py-2 px-3 text-gray-300">
                            {stats.challenges}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-300">
                            {stats.verified}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-300">{stats.settled}</td>
                          <td className="text-right py-2 px-3 text-red-400 font-semibold">
                            {conversion}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Text className="text-gray-400">Funnel data unavailable (metrics endpoint not configured)</Text>
            )}
          </Card>

          <Text className="text-gray-500 text-xs mt-6 text-center">
            Last updated: {data?.cachedAt ? new Date(data.cachedAt).toLocaleString() : 'N/A'}
          </Text>
        </>
      )}
    </main>
  );
}
