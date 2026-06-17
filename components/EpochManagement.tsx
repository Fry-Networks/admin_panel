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
  current_epoch?: number;
  timer_enabled?: boolean;
  timer_next_fire?: string | null;
  service_state?: string;
  last_publish?: {
    timestamp: string;
    wallet_count: number;
    dry_run: boolean;
    success: boolean;
    totals?: { tFRY: number; fNODE: number };
  };
  estimated_next_epoch?: { tFRY: number; fNODE: number };
  running_publish?: any;
  pool_balance_tfry?: number;
  pool_balance_fnode?: number;
  headroom_tfry?: number;
  headroom_fnode?: number;
  error?: string;
}

interface PublishLog {
  _id: string;
  epoch?: number;
  wallet_count: number;
  total_new_tfry?: number;
  total_new_fnode?: number;
  dry_run?: boolean;
  computed_at: string;
  mode?: string;
  total_distributed?: number;
  total_fees?: number;
}

interface MonitorStatus {
  mode: string;
  last_updated?: number;
  error?: string;
}

const REFRESH_INTERVAL = 30000;

export default function EpochManagement() {
  const [epochStatus, setEpochStatus] = useState<EpochStatus | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null);
  const [publishHistory, setPublishHistory] = useState<PublishLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishMode, setPublishMode] = useState<'dry' | 'live'>('dry');
  const [showMonitorConfirm, setShowMonitorConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    setStatusMessage(null);
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
      setStatusMessage({
        type: 'success',
        text: `${mode === 'dry' ? 'Dry run' : 'Live publish'} completed. Wallets: ${result.wallet_count || '?'}`
      });
      setShowPublishConfirm(false);
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Publish failed: ${err.message}` });
    } finally {
      setPublishLoading(false);
    }
  };

  const toggleMonitorMode = async () => {
    setStatusMessage(null);
    try {
      const newMode = monitorStatus?.mode === 'NORMAL' ? 'MAINTENANCE' : 'NORMAL';
      const resp = await fetch('/api/epoch/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      if (!resp.ok) throw new Error('Failed to toggle monitor mode');
      setShowMonitorConfirm(false);
      setStatusMessage({ type: 'success', text: `Monitor mode switched to ${newMode}` });
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Toggle failed: ${err.message}` });
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
    if (headroom == null) return 'gray';
    if (headroom >= 1.1) return 'green';
    if (headroom >= 1.0) return 'yellow';
    return 'red';
  };

  const getServiceStateBadge = (state?: string) => {
    if (!state) return { color: 'gray' as const, label: 'UNKNOWN' };
    const s = state.toLowerCase();
    if (s === 'active' || s === 'healthy') return { color: 'green' as const, label: state };
    if (s === 'inactive' || s === 'stopped') return { color: 'yellow' as const, label: state };
    if (s === 'error' || s === 'failed') return { color: 'red' as const, label: state };
    return { color: 'gray' as const, label: state };
  };

  const getMonitorBadgeColor = (mode?: string) => {
    return mode === 'NORMAL' ? 'green' : 'yellow';
  };

  const formatMicroToDecimal = (micro: number): string => {
    return (micro / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const serviceBadge = getServiceStateBadge(epochStatus?.service_state);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <Title>Epoch Management</Title>
        <Text>Monitor and control reward distribution triggers</Text>
      </div>

      <Divider />

      {statusMessage && (
        <Callout
          title={statusMessage.type === 'success' ? 'Success' : 'Error'}
          color={statusMessage.type === 'success' ? 'green' : 'red'}
          icon={statusMessage.type === 'success' ? RiCheckboxCircleFill : RiAlertLine}
        >
          {statusMessage.text}
        </Callout>
      )}

      <Card>
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <Title>Epoch Status</Title>
            <Text className="mt-2">
              Epoch <span className="font-mono font-bold">{epochStatus?.current_epoch ?? 'N/A'}</span>
            </Text>
            {epochStatus?.last_publish?.timestamp && (
              <Text className="text-sm text-gray-400 mt-1">
                Last publish: {new Date(epochStatus.last_publish.timestamp).toLocaleString()}
                {epochStatus.last_publish.wallet_count != null && (
                  <> &mdash; {epochStatus.last_publish.wallet_count.toLocaleString()} wallets</>
                )}
              </Text>
            )}
          </div>
          <Badge icon={RiCheckboxCircleFill} color={serviceBadge.color}>
            {serviceBadge.label}
          </Badge>
        </div>
      </Card>

      <Card>
        <Title>Pool Balance & Headroom</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-gray-800 rounded">
            <Text className="text-gray-400">tFRY Balance</Text>
            <div className="text-2xl font-bold mt-1">
              {epochStatus?.pool_balance_tfry != null
                ? epochStatus.pool_balance_tfry.toLocaleString()
                : 'N/A'}
            </div>
            <Badge
              color={getBalanceColor(epochStatus?.headroom_tfry)}
              className="mt-2"
            >
              Headroom: {epochStatus?.headroom_tfry != null ? `${epochStatus.headroom_tfry.toFixed(2)}x` : 'N/A'}
            </Badge>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <Text className="text-gray-400">fNODE Balance</Text>
            <div className="text-2xl font-bold mt-1">
              {epochStatus?.pool_balance_fnode != null
                ? epochStatus.pool_balance_fnode.toLocaleString()
                : 'N/A'}
            </div>
            <Badge
              color={getBalanceColor(epochStatus?.headroom_fnode)}
              className="mt-2"
            >
              Headroom: {epochStatus?.headroom_fnode != null ? `${epochStatus.headroom_fnode.toFixed(2)}x` : 'N/A'}
            </Badge>
          </div>
        </div>
      </Card>

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

        {!showMonitorConfirm ? (
          <Button
            onClick={() => setShowMonitorConfirm(true)}
            variant="secondary"
            className="mt-4 w-full"
          >
            Toggle to {monitorStatus?.mode === 'NORMAL' ? 'MAINTENANCE' : 'NORMAL'}
          </Button>
        ) : (
          <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700 rounded">
            <Text className="font-bold text-amber-300">
              Switch to {monitorStatus?.mode === 'NORMAL' ? 'MAINTENANCE' : 'NORMAL'} mode?
            </Text>
            <Text className="text-sm text-gray-300 mt-2">
              {monitorStatus?.mode === 'NORMAL'
                ? 'Maintenance mode will pause automated reward processing.'
                : 'Normal mode will resume automated reward processing.'}
            </Text>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={toggleMonitorMode}
                color="amber"
                size="sm"
              >
                Confirm Toggle
              </Button>
              <Button
                onClick={() => setShowMonitorConfirm(false)}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <Title>Manual Publish Controls</Title>
        <Text className="text-sm text-gray-400 mt-1">Trigger reward distribution manually</Text>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
            <div className="flex flex-wrap gap-2 mt-4">
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

      <Card>
        <Title>Publish History</Title>
        <div className="w-full max-w-full mt-4" style={{ overflowX: 'auto' }}>
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Timestamp</th>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Wallets</th>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Mode</th>
                <th className="text-left py-2 px-3 text-gray-400 font-semibold">Distributed (tFRY)</th>
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
                publishHistory.map((log) => {
                  const ts = new Date(log.computed_at);
                  const isValidDate = !isNaN(ts.getTime());
                  const mode = log.mode || (log.dry_run ? 'DRY' : 'LIVE');
                  const distributed = log.total_distributed ?? log.total_new_tfry;

                  return (
                    <tr key={log._id} className="border-b border-gray-700 hover:bg-gray-800/50">
                      <td className="py-3 px-3 text-gray-300">
                        {isValidDate ? ts.toLocaleString() : 'Unknown'}
                      </td>
                      <td className="py-3 px-3 text-gray-300">{log.wallet_count}</td>
                      <td className="py-3 px-3">
                        <Badge
                          color={mode === 'LIVE' ? 'green' : 'yellow'}
                          size="sm"
                        >
                          {mode}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-300 text-right">
                        {distributed != null ? formatMicroToDecimal(distributed) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
