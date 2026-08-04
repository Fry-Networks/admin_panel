import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Title,
  Text,
  Badge,
  Grid,
  Metric,
  AreaChart,
  Select,
  SelectItem,
} from '@tremor/react';

const HOSTS: Record<string, string> = {
  gemini00: 'GEMINI00',
  hermes00: 'HERMES00',
  hephaestus00: 'HEPHAESTUS00',
  ares00: 'ARES00',
  zeus00: 'ZEUS00',
  atlas00: 'ATLAS00',
  epimetheus00: 'EPIMETHEUS00',
  frybot: 'frybot',
  irongate: 'irongate',
};

const REFRESH_MS = 30000;

const GRAFANA_BASE = 'http://100.96.170.14:3001/grafana';

const DASHBOARDS = [
  { uid: 'rYdddlPWk', name: 'Node Exporter Full' },
  { uid: 'pMEd7m0Mz', name: 'cAdvisor' },
];

interface HostData {
  name: string;
  instance: string;
  up: boolean;
  cpu: number;
  ram: number;
  disk: number;
  load: number;
  uptime: number;
}

interface ChartPoint {
  time: string;
  value: number;
}

async function promQuery(query: string) {
  const res = await fetch(
    '/api/prom?q=' + encodeURIComponent(btoa(query))
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data?.result || [];
}

async function promRangeQuery(query: string, hours: number) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - hours * 3600;
  const step = Math.max(15, Math.floor((hours * 3600) / 200));
  const res = await fetch(
    `/api/prom?q=${encodeURIComponent(btoa(query))}&s=${start}&e=${end}&step=${step}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data?.result || [];
}

function resolveHost(instance: string): string {
  return HOSTS[instance] || instance;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return d + 'd ' + h + 'h';
  const m = Math.floor((seconds % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function fmtPct(v: number): string {
  return v.toFixed(1) + '%';
}

function pctColor(v: number): string {
  if (v >= 90) return 'text-red-400';
  if (v >= 75) return 'text-yellow-400';
  return 'text-green-400';
}

function getVal(results: any[], instance: string): number {
  const match = results.find((r: any) => r.metric.instance === instance);
  return match ? parseFloat(match.value[1]) || 0 : 0;
}

export default function MonitorPage() {
  const [hosts, setHosts] = useState<HostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'fleet' | 'grafana'>('fleet');
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{
    cpu: ChartPoint[];
    ram: ChartPoint[];
    disk: ChartPoint[];
  }>({ cpu: [], ram: [], disk: [] });
  const [chartHours, setChartHours] = useState('1');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchFleet = useCallback(async () => {
    try {
      const [upR, cpuR, ramR, diskR, loadR, uptimeR] = await Promise.all([
        promQuery('up{job!="prometheus",job!~".*-cadvisor",job!~".*-docker-engine"}'),
        promQuery(
          '100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
        ),
        promQuery(
          '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100'
        ),
        promQuery(
          '(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100'
        ),
        promQuery('node_load1'),
        promQuery('time() - node_boot_time_seconds'),
      ]);

      const list: HostData[] = (upR || []).map((r: any) => {
        const inst = r.metric.instance;
        return {
          name: resolveHost(inst),
          instance: inst,
          up: r.value[1] === '1',
          cpu: getVal(cpuR, inst),
          ram: getVal(ramR, inst),
          disk: getVal(diskR, inst),
          load: getVal(loadR, inst),
          uptime: getVal(uptimeR, inst),
        };
      });

      list.sort((a, b) => a.name.localeCompare(b.name));
      setHosts(list);
      setError(null);
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharts = useCallback(
    async (instance: string) => {
      const h = parseInt(chartHours);
      const toPoints = (res: any[]): ChartPoint[] =>
        (res?.[0]?.values || []).map((v: [number, string]) => ({
          time: new Date(v[0] * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          value: parseFloat(v[1]) || 0,
        }));

      const [cpuR, ramR, diskR] = await Promise.all([
        promRangeQuery(
          `100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle",instance="${instance}"}[5m])) * 100)`,
          h
        ),
        promRangeQuery(
          `(1 - node_memory_MemAvailable_bytes{instance="${instance}"} / node_memory_MemTotal_bytes{instance="${instance}"}) * 100`,
          h
        ),
        promRangeQuery(
          `(1 - node_filesystem_avail_bytes{mountpoint="/",instance="${instance}"} / node_filesystem_size_bytes{mountpoint="/",instance="${instance}"}) * 100`,
          h
        ),
      ]);

      setChartData({
        cpu: toPoints(cpuR),
        ram: toPoints(ramR),
        disk: toPoints(diskR),
      });
    },
    [chartHours]
  );

  useEffect(() => {
    fetchFleet();
    const iv = setInterval(fetchFleet, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchFleet]);

  useEffect(() => {
    if (selectedHost) fetchCharts(selectedHost);
  }, [selectedHost, chartHours, fetchCharts]);

  const hostsUp = hosts.filter((h) => h.up).length;
  const avgCpu = hosts.length
    ? hosts.reduce((s, h) => s + h.cpu, 0) / hosts.length
    : 0;
  const avgRam = hosts.length
    ? hosts.reduce((s, h) => s + h.ram, 0) / hosts.length
    : 0;
  const diskWarnings = hosts.filter((h) => h.disk > 85);

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Title>Fleet Monitor</Title>
            <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
              <button
                onClick={() => setView('fleet')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'fleet'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Fleet View
              </button>
              <button
                onClick={() => setView('grafana')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'grafana'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Grafana
              </button>
            </div>
          </div>
          {view === 'fleet' && lastRefresh && (
            <Text className="text-gray-500 text-sm">
              Updated {lastRefresh.toLocaleTimeString()}
            </Text>
          )}
        </div>

        {view === 'grafana' && (
          <Card className="bg-gray-900">
            <Title>Grafana Dashboards</Title>
            <Text className="text-gray-400 mt-2">
              Open Grafana dashboards in a new tab. Requires Tailscale VPN connection.
            </Text>
            <div className="mt-4 flex flex-col gap-3">
              {DASHBOARDS.map((d) => (
                <a
                  key={d.uid}
                  href={`${GRAFANA_BASE}/d/${d.uid}?orgId=1&theme=dark`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-white font-medium">{d.name}</span>
                  <span className="text-gray-500 group-hover:text-gray-300 text-sm">
                    Open in Grafana &rarr;
                  </span>
                </a>
              ))}
            </div>
            <Text className="text-gray-600 text-xs mt-4">
              Grafana: {GRAFANA_BASE}
            </Text>
          </Card>
        )}

        {view === 'fleet' && (<>

        {error && (
          <Card className="bg-red-900/30 border border-red-700">
            <Text className="text-red-300">{error}</Text>
          </Card>
        )}

        <Grid numItemsMd={4} className="gap-4">
          <Card
            className="bg-gray-900"
            decoration="top"
            decorationColor={hostsUp === hosts.length ? 'green' : 'red'}
          >
            <Text className="text-gray-400">Hosts Online</Text>
            <Metric className="text-white">
              {hostsUp} / {hosts.length}
            </Metric>
          </Card>
          <Card className="bg-gray-900">
            <Text className="text-gray-400">Avg CPU</Text>
            <Metric className={pctColor(avgCpu)}>{fmtPct(avgCpu)}</Metric>
          </Card>
          <Card className="bg-gray-900">
            <Text className="text-gray-400">Avg RAM</Text>
            <Metric className={pctColor(avgRam)}>{fmtPct(avgRam)}</Metric>
          </Card>
          <Card
            className="bg-gray-900"
            decoration="top"
            decorationColor={diskWarnings.length > 0 ? 'red' : 'green'}
          >
            <Text className="text-gray-400">Disk Warnings</Text>
            <Metric className="text-white">
              {diskWarnings.length > 0
                ? diskWarnings.map((h) => h.name).join(', ')
                : 'None'}
            </Metric>
          </Card>
        </Grid>

        <Card className="bg-gray-900">
          <Title>Fleet Status</Title>
          {loading ? (
            <Text className="mt-4 text-gray-400">Loading metrics...</Text>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-700">
                  <th className="pb-2 pr-4">Host</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4 text-right">CPU</th>
                  <th className="pb-2 pr-4 text-right">RAM</th>
                  <th className="pb-2 pr-4 text-right">Disk</th>
                  <th className="pb-2 pr-4 text-right">Load</th>
                  <th className="pb-2 text-right">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((h) => (
                  <tr
                    key={h.instance}
                    className={
                      'text-gray-300 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors' +
                      (selectedHost === h.instance ? ' bg-gray-800/70' : '')
                    }
                    onClick={() =>
                      setSelectedHost(
                        h.instance === selectedHost ? null : h.instance
                      )
                    }
                  >
                    <td className="py-2 pr-4 font-mono text-white">
                      {h.name}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge color={h.up ? 'green' : 'red'}>
                        {h.up ? 'UP' : 'DOWN'}
                      </Badge>
                    </td>
                    <td
                      className={
                        'py-2 pr-4 text-right font-mono ' + pctColor(h.cpu)
                      }
                    >
                      {fmtPct(h.cpu)}
                    </td>
                    <td
                      className={
                        'py-2 pr-4 text-right font-mono ' + pctColor(h.ram)
                      }
                    >
                      {fmtPct(h.ram)}
                    </td>
                    <td
                      className={
                        'py-2 pr-4 text-right font-mono ' + pctColor(h.disk)
                      }
                    >
                      {fmtPct(h.disk)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {h.load.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-400">
                      {formatUptime(h.uptime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {selectedHost && (
          <Card className="bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <Title>{resolveHost(selectedHost)} — Detail</Title>
              <Select
                value={chartHours}
                onValueChange={setChartHours}
                className="w-32"
              >
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
              </Select>
            </div>

            <div className="space-y-6">
              <div>
                <Text className="text-gray-400 mb-2">CPU %</Text>
                <AreaChart
                  className="h-40"
                  data={chartData.cpu}
                  index="time"
                  categories={['value']}
                  colors={['cyan']}
                  showLegend={false}
                  curveType="monotone"
                  yAxisWidth={45}
                  showAnimation={true}
                  valueFormatter={(v: number) => v.toFixed(1) + '%'}
                />
              </div>
              <div>
                <Text className="text-gray-400 mb-2">RAM %</Text>
                <AreaChart
                  className="h-40"
                  data={chartData.ram}
                  index="time"
                  categories={['value']}
                  colors={['violet']}
                  showLegend={false}
                  curveType="monotone"
                  yAxisWidth={45}
                  showAnimation={true}
                  valueFormatter={(v: number) => v.toFixed(1) + '%'}
                />
              </div>
              <div>
                <Text className="text-gray-400 mb-2">Disk %</Text>
                <AreaChart
                  className="h-40"
                  data={chartData.disk}
                  index="time"
                  categories={['value']}
                  colors={['amber']}
                  showLegend={false}
                  curveType="monotone"
                  yAxisWidth={45}
                  showAnimation={true}
                  valueFormatter={(v: number) => v.toFixed(1) + '%'}
                />
              </div>
            </div>
          </Card>
        )}

        </>)}
      </div>
    </div>
  );
}
