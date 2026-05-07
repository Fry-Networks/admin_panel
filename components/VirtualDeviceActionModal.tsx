import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface Props {
  isOpen: boolean;
  action: 'activate' | 'deactivate' | 'transition' | 'bulk-activate' | 'bulk-deactivate' | null;
  device?: { miner_key: string; email: string; order: string } | null;
  bulkCount?: number;
  onConfirm: (data: { reward_wallet?: string; physical_miner_key?: string }) => void;
  onCancel: () => void;
  loading: boolean;
}

const titles: Record<string, string> = {
  activate: 'Activate Virtual Device',
  deactivate: 'Deactivate Virtual Device',
  transition: 'Transition to Physical Device',
  'bulk-activate': 'Bulk Activate Devices',
  'bulk-deactivate': 'Bulk Deactivate Devices',
};

export default function VirtualDeviceActionModal({
  isOpen, action, device, bulkCount, onConfirm, onCancel, loading,
}: Props) {
  const [rewardWallet, setRewardWallet] = useState('');
  const [physicalKey, setPhysicalKey] = useState('');

  const handleConfirm = () => {
    const data: { reward_wallet?: string; physical_miner_key?: string } = {};
    if (action === 'activate' || action === 'bulk-activate') {
      data.reward_wallet = rewardWallet || undefined;
    }
    if (action === 'transition') {
      if (!physicalKey.trim()) return;
      data.physical_miner_key = physicalKey.trim();
    }
    onConfirm(data);
  };

  const handleClose = () => {
    setRewardWallet('');
    setPhysicalKey('');
    onCancel();
  };

  if (!action) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-700 p-6 shadow-xl">
                <Dialog.Title className="text-lg font-medium text-white">
                  {titles[action] || 'Confirm Action'}
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {device && (
                    <div className="text-sm text-gray-400">
                      <p><span className="text-gray-300">Device:</span> {device.miner_key}</p>
                      <p><span className="text-gray-300">Email:</span> {device.email}</p>
                      <p><span className="text-gray-300">Order:</span> #{device.order}</p>
                    </div>
                  )}

                  {bulkCount !== undefined && (
                    <p className="text-sm text-gray-400">
                      This will affect <span className="text-white font-medium">{bulkCount}</span> device{bulkCount !== 1 ? 's' : ''}.
                    </p>
                  )}

                  {(action === 'activate' || action === 'bulk-activate') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Reward Wallet (optional)
                      </label>
                      <input type="text" value={rewardWallet} onChange={e => setRewardWallet(e.target.value)}
                        placeholder="Algorand address..."
                        className="w-full rounded-md bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm
                          placeholder-gray-500 focus:border-red-500 focus:ring-red-500" />
                    </div>
                  )}

                  {action === 'transition' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Physical Miner Key (required)
                      </label>
                      <input type="text" value={physicalKey} onChange={e => setPhysicalKey(e.target.value)}
                        placeholder="e.g. RDN-XXXXXXXX..."
                        className="w-full rounded-md bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm
                          placeholder-gray-500 focus:border-red-500 focus:ring-red-500" />
                      {action === 'transition' && !physicalKey.trim() && (
                        <p className="mt-1 text-xs text-red-400">Physical miner key is required for transition</p>
                      )}
                    </div>
                  )}

                  {action === 'deactivate' && (
                    <p className="text-sm text-yellow-400">
                      This will deactivate the device and clear its reward wallet. The device will stop earning rewards.
                    </p>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={handleClose} disabled={loading}
                    className="px-4 py-2 text-sm rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleConfirm} disabled={loading || (action === 'transition' && !physicalKey.trim())}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                    {loading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
