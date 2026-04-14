import type { GetServerSideProps } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  Card,
  Title,
  Text,
  Badge,
  Button,
  NumberInput,
  Select,
  SelectItem,
  Divider,
} from '@tremor/react';

interface Worker {
  host: string;
  port: number;
  gpu: string;
}

interface ClusterConfig {
  model_path: string;
  chat_template: string;
  ctx_size: number;
  n_gpu_layers: number;
  threads: number;
  tensor_split: number[];
  workers: Worker[];
}

interface ServiceState {
  name: string;
  state: string;
}

interface StatusPayload {
  config: ClusterConfig;
  service: ServiceState;
}

type Props = {
  initial: StatusPayload | null;
  error: string | null;
};

type ReloadState = 'idle' | 'confirming' | 'reloading' | 'success' | 'error';

const CHAT_TEMPLATES = [
  'mistral-v7',
  'mistral-v7-tekken',
  'mistral-v3',
  'mistral-v3-tekken',
  'chatml',
  'llama3',
];

export default function ClusterPage({ initial, error }: Props) {
  const [chatTemplate, setChatTemplate] = useState(
    initial?.config.chat_template ?? '',
  );
  const [ctxSize, setCtxSize] = useState(initial?.config.ctx_size ?? 8192);
  const [gpuLayers, setGpuLayers] = useState(
    initial?.config.n_gpu_layers ?? 99,
  );
  const [threads, setThreads] = useState(initial?.config.threads ?? 4);
  const [weights, setWeights] = useState<number[]>(
    initial?.config.tensor_split ?? [],
  );

  const [reloadState, setReloadState] = useState<ReloadState>('idle');
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (reloadState !== 'reloading' || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [reloadState, startTime]);

  const updateWeight = useCallback((index: number, value: number) => {
    setWeights((prev) => {
      const next = [...prev];
      next[index] = Math.max(1, Math.floor(value));
      return next;
    });
  }, []);

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const handleReload = useCallback(async () => {
    if (!initial) return;
    setReloadState('reloading');
    setReloadError(null);
    setStartTime(Date.now());
    setElapsed(0);

    const payload: ClusterConfig = {
      model_path: initial.config.model_path,
      chat_template: chatTemplate,
      ctx_size: ctxSize,
      n_gpu_layers: gpuLayers,
      threads,
      tensor_split: weights,
      workers: initial.config.workers,
    };

    try {
      const res = await fetch('/api/cluster/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        setReloadState('error');
        setReloadError(`Reload failed (${res.status}): ${body}`);
        return;
      }
      setReloadState('success');
      setTimeout(() => window.location.reload(), 3000);
    } catch (e) {
      setReloadState('error');
      setReloadError(`Reload error: ${String(e)}`);
    }
  }, [initial, chatTemplate, ctxSize, gpuLayers, threads, weights]);

  if (error) {
    return (
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="p-6 space-y-6">
          <Title>Cluster Management</Title>
          <Card className="bg-gray-900">
            <Text className="text-red-400">{error}</Text>
            <a href="/cluster">
              <Button className="mt-4">Retry</Button>
            </a>
          </Card>
        </div>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="p-6 space-y-6">
          <Title>Cluster Management</Title>
          <Card className="bg-gray-900">
            <Text>Cluster-control unreachable.</Text>
            <a href="/cluster">
              <Button className="mt-4">Retry</Button>
            </a>
          </Card>
        </div>
      </div>
    );
  }

  const { config, service } = initial;
  const modelName = config.model_path.split('/').pop() ?? config.model_path;

  const badgeColor =
    service.state === 'active'
      ? 'green'
      : service.state === 'inactive'
        ? 'yellow'
        : service.state === 'failed'
          ? 'red'
          : 'gray';

  const badgeText =
    service.state === 'active'
      ? 'Active'
      : service.state === 'inactive'
        ? 'Inactive'
        : service.state === 'failed'
          ? 'Failed'
          : service.state;

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      <div className="p-6 space-y-6 max-w-4xl">
        <Title>Cluster Management</Title>

        {/* Status */}
        <Card className="bg-gray-900">
          <Title>Service Status</Title>
          <div className="mt-3 flex items-center gap-3">
            <Badge color={badgeColor}>{badgeText}</Badge>
            <Text className="text-gray-300">{service.name}</Text>
          </div>
          <div className="mt-2">
            <Text className="text-gray-400">Model</Text>
            <Text className="text-white font-mono">{modelName}</Text>
          </div>
        </Card>

        {/* Configuration */}
        <Card className="bg-gray-900">
          <Title>Configuration</Title>
          <div className="mt-4 space-y-5">
            <div>
              <Text className="text-gray-400 mb-1">Chat Template</Text>
              <Select value={chatTemplate} onValueChange={setChatTemplate}>
                {CHAT_TEMPLATES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <Text className="text-gray-400 mb-1">Context Size</Text>
              <NumberInput
                value={ctxSize}
                onValueChange={setCtxSize}
                min={2048}
                step={1}
              />
              <Text className="text-gray-500 text-xs mt-1">
                Common: 8192 &middot; 16384 &middot; 32768 &middot; 65536
              </Text>
            </div>
            <div>
              <Text className="text-gray-400 mb-1">GPU Layers</Text>
              <NumberInput
                value={gpuLayers}
                onValueChange={setGpuLayers}
                min={1}
                step={1}
              />
              <Text className="text-gray-500 text-xs mt-1">
                99 = all layers offloaded to GPU
              </Text>
            </div>
            <div>
              <Text className="text-gray-400 mb-1">Threads</Text>
              <NumberInput
                value={threads}
                onValueChange={setThreads}
                min={1}
                step={1}
              />
            </div>
          </div>
        </Card>

        {/* Tensor Split */}
        <Card className="bg-gray-900">
          <Title>Tensor Split</Title>
          <Text className="text-gray-400 mt-1">
            Integer weights — not percentages. llama-server receives
            --tensor-split &#123;values&#125;.
          </Text>
          <div className="mt-4 space-y-3">
            {config.workers.map((worker, i) => {
              const pct =
                totalWeight > 0
                  ? Math.round(((weights[i] ?? 1) / totalWeight) * 100)
                  : 0;
              return (
                <div
                  key={`${worker.host}:${worker.port}`}
                  className="flex items-center gap-4 flex-wrap sm:flex-nowrap"
                >
                  <Text className="text-gray-300 w-20 shrink-0">
                    Worker {i}
                  </Text>
                  <Text className="text-gray-500 w-36 shrink-0 text-sm truncate">
                    {worker.gpu}
                  </Text>
                  <Text className="text-gray-500 w-28 shrink-0 text-sm font-mono">
                    {worker.host}
                  </Text>
                  <div className="w-24 shrink-0">
                    <NumberInput
                      value={weights[i] ?? 1}
                      onValueChange={(v) => updateWeight(i, v)}
                      min={1}
                      step={1}
                    />
                  </div>
                  <Text className="text-gray-300 w-12 text-right font-mono">
                    {pct}%
                  </Text>
                </div>
              );
            })}
          </div>
          <Divider />
          <pre className="text-sm text-gray-300 bg-gray-800 p-2 rounded font-mono">
            --tensor-split {weights.join(',')}
          </pre>
        </Card>

        {/* Workers */}
        <Card className="bg-gray-900">
          <Title>Workers</Title>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Host</th>
                <th className="pb-2 pr-4">Port</th>
                <th className="pb-2">GPU</th>
              </tr>
            </thead>
            <tbody>
              {config.workers.map((worker, i) => (
                <tr
                  key={`${worker.host}:${worker.port}`}
                  className="text-gray-300"
                >
                  <td className="py-1 pr-4">{i}</td>
                  <td className="py-1 pr-4 font-mono">{worker.host}</td>
                  <td className="py-1 pr-4 font-mono">{worker.port}</td>
                  <td className="py-1">{worker.gpu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Save & Reload */}
        <Card className="bg-gray-900">
          <Title>Save &amp; Reload</Title>
          <Text className="text-yellow-400 mt-2">
            &#9888;&#65039; Reloading streams an 18 GB model over Tailscale.
            Expect 28–33 minutes of inference downtime. The page will poll for
            recovery automatically.
          </Text>

          {reloadState === 'idle' && (
            <Button
              color="red"
              className="mt-4"
              onClick={() => setReloadState('confirming')}
            >
              Save &amp; Reload
            </Button>
          )}

          {reloadState === 'confirming' && (
            <div className="mt-4 space-y-3">
              <Text className="text-gray-300">
                This will restart llama-devstral. Workers will be unavailable
                for ~30 minutes. Click Confirm Reload to proceed.
              </Text>
              <div className="flex gap-2">
                <Button color="red" onClick={handleReload}>
                  Confirm Reload
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setReloadState('idle')}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {reloadState === 'reloading' && (
            <div className="mt-4">
              <Text className="text-blue-400 animate-pulse">
                Reloading&hellip; {elapsed}s elapsed
              </Text>
            </div>
          )}

          {reloadState === 'success' && (
            <div className="mt-4">
              <Text className="text-green-400">
                Reload complete. Refreshing status&hellip;
              </Text>
            </div>
          )}

          {reloadState === 'error' && (
            <div className="mt-4 space-y-3">
              <Text className="text-red-400">{reloadError}</Text>
              <Button
                color="red"
                onClick={() => setReloadState('confirming')}
              >
                Save &amp; Reload
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (
  context,
) => {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions,
  );
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const url = process.env.CLUSTER_API_URL;
  const key = process.env.CLUSTER_API_KEY;
  if (!url || !key) {
    return {
      props: {
        initial: null,
        error: 'CLUSTER_API_URL or CLUSTER_API_KEY not set in container env',
      },
    };
  }

  try {
    const res = await fetch(`${url}/status`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { props: { initial: null, error: `upstream ${res.status}` } };
    }
    const data = (await res.json()) as StatusPayload;
    return { props: { initial: data, error: null } };
  } catch (e) {
    return { props: { initial: null, error: String(e) } };
  }
};
