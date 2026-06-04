import { useState } from 'react';

interface VirtualDevice {
  _id: string;
  miner_key: string;
  email: string;
  order: string;
  activated: boolean;
  activated_at: string | null;
  reward_wallet: string | null;
  wix_order_id: string | null;
  transitioned_at: string | null;
  transitioned_to_device: string | null;
  canceled_at: string | null;
  created_at: string;
}

interface Props {
  devices: VirtualDevice[];
  selectedKeys: Set<string>;
  onSelect: (keys: Set<string>) => void;
  onAction: (action: string, device: VirtualDevice) => void;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getStatus(d: VirtualDevice): string {
  if (d.canceled_at) return 'Canceled';
  if (d.transitioned_at) return 'Transitioned';
  if (d.activated) return 'Activated';
  return 'Pending';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Activated': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Transitioned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Canceled': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function truncate(str: string | null, len: number): string {
  if (!str) return '-';
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function VirtualDevicesTable({
  devices, selectedKeys, onSelect, onAction, loading, page, totalPages, onPageChange,
}: Props) {
  const allSelected = devices.length > 0 && devices.every(d => selectedKeys.has(d.miner_key));

  const toggleAll = () => {
    if (allSelected) onSelect(new Set());
    else onSelect(new Set(devices.map(d => d.miner_key)));
  };

  const toggleOne = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelect(next);
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading devices...</div>;
  if (devices.length === 0) return <div className="text-gray-500 py-8 text-center">No virtual devices found</div>;

  return (
    <div>
      <div data-testid="virtual-devices-table" className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
            <tr>
              <th className="px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-red-500" />
              </th>
              <th className="px-3 py-3">Miner Key</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Activated</th>
              <th className="px-3 py-3">Wallet</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {devices.map((d) => {
              const status = getStatus(d);
              const prefix = d.miner_key.split('-')[0] || '';
              return (
                <tr key={d._id} className="hover:bg-gray-800/50">
                  <td className="px-3 py-3">
                    <input data-testid="virtual-device-checkbox" type="checkbox" checked={selectedKeys.has(d.miner_key)}
                      onChange={() => toggleOne(d.miner_key)}
                      className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-red-500" />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <span className="text-red-400 font-semibold">{prefix}</span>
                    <span className="text-gray-400">-{d.miner_key.slice(prefix.length + 1, prefix.length + 9)}...</span>
                  </td>
                  <td className="px-3 py-3 text-gray-300">{truncate(d.email, 25)}</td>
                  <td className="px-3 py-3 text-gray-400">#{d.order}</td>
                  <td className="px-3 py-3">
                    <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ' + getStatusColor(status)}>
                      {status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{formatDate(d.activated_at)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-400">
                    {d.reward_wallet ? (
                      <span title={d.reward_wallet}>{truncate(d.reward_wallet, 12)}</span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <ActionMenu status={status} device={d} onAction={onAction} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-gray-700">
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="px-3 py-1 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Prev
            </button>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionMenu({ status, device, onAction }: {
  status: string; device: VirtualDevice;
  onAction: (action: string, device: VirtualDevice) => void;
}) {
  const [open, setOpen] = useState(false);

  const actions: Array<{ label: string; action: string }> = [];
  if (status === 'Pending') actions.push({ label: 'Activate', action: 'activate' });
  if (status === 'Activated') {
    actions.push({ label: 'Deactivate', action: 'deactivate' });
    actions.push({ label: 'Transition', action: 'transition' });
  }
  if (status === 'Pending' || status === 'Activated') {
    actions.push({ label: 'Cancel', action: 'cancel' });
  }

  if (actions.length === 0) return <span className="text-gray-600 text-xs">-</span>;

  return (
    <div className="relative">
      <button data-testid="virtual-device-actions" onClick={() => setOpen(!open)}
        className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700">
        Actions
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-36 rounded-md bg-gray-800 shadow-lg ring-1 ring-black/20">
            {actions.map(a => (
              <button key={a.action} data-testid={'action-' + a.action} onClick={() => { setOpen(false); onAction(a.action, device); }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
