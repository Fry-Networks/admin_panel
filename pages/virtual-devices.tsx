import { useState, useEffect, useCallback } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { getSession } from 'next-auth/react';
import VirtualDevicesTable from '../components/VirtualDevicesTable';
import VirtualDeviceActionModal from '../components/VirtualDeviceActionModal';

interface Stats {
  total: number;
  pending: number;
  activated: number;
  transitioned: number;
  canceled: number;
  byType: Record<string, number>;
}

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

export default function VirtualDevicesPage() {
  const [devices, setDevices] = useState<VirtualDevice[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, activated: 0, transitioned: 0, canceled: 0, byType: {} });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [modalAction, setModalAction] = useState<any>(null);
  const [modalDevice, setModalDevice] = useState<VirtualDevice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        status: statusFilter,
        type: typeFilter,
      });
      if (search) params.set('search', search);

      const res = await fetch('/api/virtual-devices?' + params.toString());
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDevices(data.devices);
      setTotalPages(data.totalPages);
      setStats(data.stats);
    } catch {
      showToast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAction = (action: string, device: VirtualDevice) => {
    setModalDevice(device);
    setModalAction(action);
  };

  const handleBulkAction = (action: string) => {
    setModalDevice(null);
    setModalAction('bulk-' + action);
  };

  const handleConfirm = async (data: { reward_wallet?: string; physical_miner_key?: string }) => {
    setActionLoading(true);
    try {
      if (modalAction === 'activate' && modalDevice) {
        const res = await fetch('/api/virtual-devices/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ miner_key: modalDevice.miner_key, reward_wallet: data.reward_wallet }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        showToast('Device activated', 'success');
      } else if (modalAction === 'deactivate' && modalDevice) {
        const res = await fetch('/api/virtual-devices/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ miner_key: modalDevice.miner_key }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        showToast('Device deactivated', 'success');
      } else if (modalAction === 'transition' && modalDevice) {
        const res = await fetch('/api/virtual-devices/transition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            virtual_miner_key: modalDevice.miner_key,
            physical_miner_key: data.physical_miner_key,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        showToast('Device transitioned', 'success');
      } else if (modalAction === 'cancel' && modalDevice) {
        const res = await fetch('/api/virtual-devices/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ miner_key: modalDevice.miner_key }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        showToast('Device canceled', 'success');
      } else if (modalAction === 'bulk-cancel') {
        const res = await fetch('/api/virtual-devices/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            miner_keys: Array.from(selectedKeys),
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        const result = await res.json();
        showToast(result.success + ' succeeded, ' + result.failed + ' failed', result.failed > 0 ? 'warning' : 'success');
        setSelectedKeys(new Set());
      } else if (modalAction?.startsWith('bulk-')) {
        const action = modalAction.replace('bulk-', '');
        const res = await fetch('/api/virtual-devices/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            miner_keys: Array.from(selectedKeys),
            reward_wallet: data.reward_wallet,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        const result = await res.json();
        showToast(result.success + ' succeeded, ' + result.failed + ' failed', result.failed > 0 ? 'warning' : 'success');
        setSelectedKeys(new Set());
      }
      setModalAction(null);
      setModalDevice(null);
      fetchDevices();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-white' },
    { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
    { label: 'Activated', value: stats.activated, color: 'text-green-400' },
    { label: 'Transitioned', value: stats.transitioned, color: 'text-blue-400' },
    { label: 'Canceled', value: stats.canceled, color: 'text-red-400' },
  ];

  return (
    <main data-testid="virtual-devices-page" className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Virtual Devices</Title>
      <Text className="text-gray-400 mt-1">
        Manage virtual mining devices from Wix orders
      </Text>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {statCards.map(s => (
          <Card key={s.label} className="bg-gray-900 border-gray-700 p-4">
            <Text className="text-gray-400 text-xs uppercase">{s.label}</Text>
            <p className={'text-2xl font-bold mt-1 ' + s.color}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Type Breakdown */}
      <div className="flex gap-4 mt-4">
        {['VRDN', 'VSDN', 'VSVN'].map(t => (
          <span key={t} className="text-xs text-gray-500">
            {t}: <span className="text-gray-300">{stats.byType[t] || 0}</span>
          </span>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mt-6">
        <input data-testid="virtual-devices-search"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search email, miner key, order, wix order..."
          className="flex-1 min-w-[200px] h-10 rounded-md border border-gray-600 bg-gray-800 text-white placeholder-gray-400 px-3 text-sm focus:border-red-500 focus:ring-red-500"
        />
        <select data-testid="virtual-devices-status-filter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-gray-600 bg-gray-800 text-gray-300 px-3 text-sm focus:border-red-500">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="activated">Activated</option>
          <option value="transitioned">Transitioned</option>
          <option value="canceled">Canceled</option>
        </select>
        <select data-testid="virtual-devices-type-filter" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-gray-600 bg-gray-800 text-gray-300 px-3 text-sm focus:border-red-500">
          <option value="all">All Types</option>
          <option value="VRDN">VRDN</option>
          <option value="VSDN">VSDN</option>
          <option value="VSVN">VSVN</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedKeys.size > 0 && (
        <div data-testid="bulk-actions-bar" className="flex items-center gap-3 mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <span className="text-sm text-gray-300">{selectedKeys.size} selected</span>
          <button onClick={() => handleBulkAction('activate')}
            className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700">
            Activate All
          </button>
          <button onClick={() => handleBulkAction('deactivate')}
            className="px-3 py-1.5 text-sm rounded bg-yellow-600 text-white hover:bg-yellow-700">
            Deactivate All
          </button>
          <button onClick={() => handleBulkAction('cancel')}
            className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700">
            Cancel All
          </button>
          <button onClick={() => setSelectedKeys(new Set())}
            className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600 ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="mt-6 bg-gray-900 border-gray-700">
        <VirtualDevicesTable
          devices={devices}
          selectedKeys={selectedKeys}
          onSelect={setSelectedKeys}
          onAction={handleAction}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      {/* Modal */}
      <VirtualDeviceActionModal
        isOpen={!!modalAction}
        action={modalAction}
        device={modalDevice}
        bulkCount={modalAction?.startsWith('bulk-') ? selectedKeys.size : undefined}
        onConfirm={handleConfirm}
        onCancel={() => { setModalAction(null); setModalDevice(null); }}
        loading={actionLoading}
      />

      {/* Toast */}
      {toast && (
        <div data-testid="toast-message" className={'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ' +
          (toast.type === 'error' ? 'bg-red-900 text-red-200 border border-red-700' :
           toast.type === 'warning' ? 'bg-yellow-900 text-yellow-200 border border-yellow-700' :
           'bg-green-900 text-green-200 border border-green-700')}>
          {toast.msg}
        </div>
      )}
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.admin) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: {} };
}
