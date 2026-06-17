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
} from '@tremor/react';
import {
  RiAlertLine,
  RiCheckboxCircleFill,
  RiLoader4Line,
  RiTimerLine,
} from '@remixicon/react';

interface EpochStatus {
  epoch: number;
  last_publish_timestamp?: number;
  timer_state?: string;
  service_state?: string;
  pool_balance_tfry?: number;
  pool_balance_fnode?: number;
  headroom_tfry?: number;
  headroom_fnode?: number;
  error?: string;
}

interface PublishLog {
  _id: string;
  computed_at: number;
  wallet_count: number;
  mode: string;
  total_distributed?: number;
  total_fees?: number;
}

interface MonitorStatus {
  mode: string;
  last_updated?: number;
  error?: string;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function EpochManagement() {
  const [epochStatus, setEpochStatus] = useState<EpochStatus | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null);
  const [publishHistory, setPublishHistory] = useState<PublishLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishMode, setPublishMode] = useState<'dry' | 'live'>('dry');

  const loadStatus = useCallback(async () => {
    try {
      setError('');
      const [statusResp, monitorResp, historyResp] = await Promise.all([
        fetch('/api/epoch/status'),
        fetch('/api/epoch/monitor'),
        fetch('/api/epoch/history'),
      ]);

      if (!statusResp.ok) throw new Error('Failed to load epoch status');
      if (!monitorResp.ok) throw new Error('Failed to load monitor status');
      if (!historyResp.ok) throw new Error('Failed to load publish history');

      const status = await statusResp.json();
      const monitor = await monitorResp.json();
      const history = await historyResp.json();

      setEpochStatus(status);
      setMonitorStatus(monitor);
      setPublishHistory(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load status');
      console.error('Status load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handlePublish = async (mode: 'dry' | 'live') => {
    setPublishLoading(true);
    try {
      const resp = await fetch('/api/epoch/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, dry_run: mode === 'dry' }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Publish failed');
      }

      const result = await resp.json();
      alert(`${mode === 'dry' ? 'Dry run' : 'Live publish'} completed. Wallets: ${result.wallet_count || '?'}`);
      setShowPublishConfirm(false);
      await loadStatus();
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setPublishLoading(false);
    }
  };

  const toggleMonitorMode = async () => {
    try {
      const newMode = monitorStatus?.mode === 'NORMAL' ? 'MAINTENANCE' : 'NORMAL';
      const resp = await fetch('/api/epoch/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      if (!resp.ok) throw new Error('Failed to toggle monitor mode');
      await loadStatus();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Callout title="Loading..." icon={RiLoader4Line} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Callout title="Error" color="red" icon={RiAlertLine}>
          <Text>{error}</Text>
        </Callout>
      </div>
    );
  }

  const getBalanceColor = (headroom?: number) => {
    if (!headroom) return 'gray';
    if (headroom >= 1.1) return 'green';
    if (headroom >= 1.0) return 'yellow';
    return 'red';
  };

  const getMonitorBadgeColor = (mode?: string) => {
    return mode === 'NORMAL' ? 'green' : 'yellow';
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <Title>Epoch Management</Title>
        <Text>Monitor and control reward distribution triggers</Text>
      </div>

      <Divider />

      {/* Epoch Status Card */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <Title>Epoch Status</Title>
            <Text className="mt-2">
              Epoch <span className="font-mono font-bold">{epochStatus?.epoch || 'N/A'}</span>
            </Text>
            {epochStatus?.last_publish_timestamp && (
              <Text className="text-sm text-gray-400 mt-1">
                Last publish: {new Date(epochStatus.last_publish_timestamp * 1000).toLocaleString()}
              </Text>
            )}
          </div>
          <Badge icon={RiCheckboxCircleFill} color="green">
            {epochStatus?.service_state || 'HEALTHY'}
          </Badge>
        </div>
      </Card>

      {/* Pool Balance Card */}
      <Card>
        <Title>Pool Balance & Headroom</Title>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-gray-800 rounded">
            <Text className="text-gray-400">tFRY Balance</Text>
            <div className="text-2xl font-bold mt-1">
              {epochStatus?.pool_balance_tfry?.toLocaleString() || 'N/A'}
            </div>
            <Badge
              color={getBalanceColor(epochStatus?.headroom_tfry)}
              className="mt-2"
            >
              Headroom: {epochStatus?.headroom_tfry?.toFixed(2)}x
            </Badge>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <Text className="text-gray-400">fNODE Balance</Text>
            <div className="text-2xl font-bold mt-1">
              {epochStatus?.pool_balance_fnode?.toLocaleString() || 'N/A'}
            </div>
            <Badge
              color={getBalanceColor(epochStatus?.headroom_fnode)}
              className="mt-2"
            >
              Headroom: {epochStatus?.headroom_fnode?.toFixed(2)}x
            </Badge>
          </div>
        </div>
      </Card>

      {/* Monitor Status Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Title>Monitor Status</Title>
            <Text className="text-sm text-gray-400 mt-1">Reward service mode</Text>
          </div>
          <Badge
            icon={RiTimerLine}
            color={getMonitorBadgeColor(monitorStatus?.mode)}
          >
            {monitorStatus?.mode || 'UNKNOWN'}
          </Badge>
        </div>
        <Button
          onClick={toggleMonitorMode}
          variant="secondary"
          className="mt-4 w-full"
        >
          Toggle to {monitorStatus?.mode === 'NORMAL' ? 'MAINTENANCE' : 'NORMAL'}
        </Button>
      </Card>

      {/* Manual Publish Controls */}
      <Card>
        <Title>Manual Publish Controls</Title>
        <Text className="text-sm text-gray-400 mt-1">Trigger reward distribution manually</Text>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button
            onClick={() => handlePublish('dry')}
            disabled={publishLoading}
            variant="secondary"
          >
            {publishLoading ? 'Publishing...' : 'Dry Run'}
          </Button>
          <Button
            onClick={() => {
              setPublishMode('live');
              setShowPublishConfirm(true);
            }}
            disabled={publishLoading}
            color="red"
          >
            Live Publish
          </Button>
        </div>

        {showPublishConfirm && publishMode === 'live' && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded">
            <Text className="font-bold text-red-300">
              Confirm live publish?
            </Text>
            <Text className="text-sm text-gray-300 mt-2">
              This will distribute rewards to all wallets immediately.
            </Text>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handlePublish('live')}
                disabled={publishLoading}
                color="red"
                size="sm"
              >
                {publishLoading ? 'Publishing...' : 'Confirm Publish'}
              </Button>
              <Button
                onClick={() => setShowPublishConfirm(false)}
                disabled={publishLoading}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Publish History Table */}
      <Card>
        <Title>Publish History</Title>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Timestamp</th>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Wallets</th>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Mode</th>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Distributed</th>
              </tr>
            </thead>
            <tbody>
              {publishHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-500">
                    No publish history
                  </td>
                </tr>
              ) : (
                publishHistory.map((log) => (
                  <tr key={log._id} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="py-3 px-3 text-gray-300">
                      {new Date(log.computed_at * 1000).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-gray-300">{log.wallet_count}</td>
                    <td className="py-3 px-3">
                      <Badge
                        color={log.mode === 'LIVE' ? 'green' : 'yellow'}
                        size="sm"
                      >
                        {log.mode}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-gray-300 text-right">
                      {log.total_distributed ? log.total_distributed.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
