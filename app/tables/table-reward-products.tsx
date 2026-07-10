import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  Callout,
  NumberInput,
  TextInput,
  Flex,
  Select,
  SelectItem,
} from '@tremor/react';
import { CheckCircleIcon, XCircleIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import Modal from 'react-modal';
import { modalStyles } from '../../lib/modal-styles';
import { useRef, useState } from 'react';
import { FryToken } from '../../lib/tokens-schema';

interface RewardTokenRow {
  asa_id: string;
  amount: number;
  name: string;
}

export default function RewardProductsTable({
  productGroups,
  tokens,
  versionConfigMap,
  enabled
}: {
  productGroups: any[];
  tokens: FryToken[];
  versionConfigMap: Record<string, any>;
  enabled: boolean;
}) {
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [rewardTokens, setRewardTokens] = useState<RewardTokenRow[]>([]);

  const openEditModal = (group: any) => {
    // Initialize reward tokens from rewards[] array if present, else from scalar
    const existing = group.reward.tokens?.rewards;
    if (existing && existing.length > 0) {
      setRewardTokens(existing.map((r: any) => ({
        asa_id: r.asa_id || '',
        amount: r.amount || 0,
        name: r.name || ''
      })));
    } else {
      const scalarAsaId = versionConfigMap?.[group.key]?.reward_token_asa_id
        ?? group.reward.tokens?.reward ?? '';
      const scalarAmount = versionConfigMap?.[group.key]?.reward_amount
        ?? group.reward.tokens?.reward_amount ?? 0;
      const scalarName = versionConfigMap?.[group.key]?.reward_token_name
        ?? tokens.find(t => t.asset_id === scalarAsaId)?.name ?? '';
      if (scalarAsaId && scalarAsaId !== 'none') {
        setRewardTokens([{ asa_id: scalarAsaId, amount: scalarAmount, name: scalarName }]);
      } else {
        setRewardTokens([{ asa_id: '', amount: 0, name: '' }]);
      }
    }
    setEditingGroup(group);
  };

  const closeModal = () => {
    setEditingGroup(null);
    setRewardTokens([]);
  };

  const unverifiedRewardRef = useRef<HTMLInputElement>(null);
  const globalMultiplierRef = useRef<HTMLInputElement>(null);

  const addTokenRow = () => {
    setRewardTokens(prev => [...prev, { asa_id: '', amount: 0, name: '' }]);
  };

  const removeTokenRow = (index: number) => {
    setRewardTokens(prev => prev.filter((_, i) => i !== index));
  };

  const updateTokenRow = (index: number, field: keyof RewardTokenRow, value: any) => {
    setRewardTokens(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-set name from token list when asa_id changes
      if (field === 'asa_id') {
        const tokenDoc = tokens.find(t => t.asset_id === value);
        if (tokenDoc) updated[index].name = tokenDoc.name;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!editingGroup) return;

    const unverifiedReward = unverifiedRewardRef.current?.value;
    // Filter out empty rows
    const validTokens = rewardTokens.filter(t => t.asa_id && t.asa_id !== 'none');

    const updateData: any = {
      productKey: editingGroup.key,
      unverifiedReward: unverifiedReward,
      verifiedReward: unverifiedReward,
      // Legacy scalar fields from first token for backwards compat
      reward_token: validTokens[0]?.asa_id || 'none',
      reward_amount: String(validTokens[0]?.amount || 0),
      // Multi-token array
      rewards: validTokens,
    };

    try {
      const response = await fetch('/api/edit-product', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        throw new Error('HTTP error! Status: ' + response.status);
      }

      setUpdateSuccess(editingGroup.name);
      setTimeout(() => {
        window.location.reload();
        setUpdateSuccess('');
      }, 1000);
    } catch (err) {
      console.error('Error updating product:', err);
    }

    setEditingGroup(null);
    closeModal();
  };

  const updateMultiplier = async () => {
    try {
      const response = await fetch('/api/update-multiplier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: globalMultiplier })
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        throw new Error('HTTP error! Status: ' + response.status);
      }

      setUpdateSuccess('multiplier');
      setTimeout(() => {
        window.location.reload();
        setUpdateSuccess('');
      }, 1000);
    } catch (err) {
      console.error('Error updating multiplier:', err);
    }
  };

  // Helper: display token names for a product group
  const getTokenDisplay = (group: any) => {
    const rewards = group.reward.tokens?.rewards;
    if (rewards && rewards.length > 0) {
      return rewards.map((r: any) => r.name || r.asa_id).join(', ');
    }
    // Fallback to scalar
    const asaId = group.reward.tokens?.reward;
    if (asaId && asaId !== 'none') {
      return tokens.find(t => t.asset_id === asaId)?.name || asaId;
    }
    return 'None';
  };

  const getAmountDisplay = (group: any) => {
    const rewards = group.reward.tokens?.rewards;
    if (rewards && rewards.length > 0) {
      return rewards.map((r: any) => `${r.amount}`).join(' + ');
    }
    return group.reward.tokens?.reward_amount ?? '\u2014';
  };

  return (
    <div>
      {updateSuccess != '' && updateSuccess != 'error' && (
        <Callout className="mt-4" title="Success" icon={CheckCircleIcon} color="teal">
          Successfully updated {updateSuccess}!
        </Callout>
      )}
      {updateSuccess == 'error' && (
        <Callout className="mt-4" title="Error" icon={CheckCircleIcon} color="red">
          Error updating product!
        </Callout>
      )}
      <Flex flexDirection="col">
        <Flex flexDirection="row" className="mt-6">
          <NumberInput
            ref={globalMultiplierRef}
            defaultValue={globalMultiplier}
            step={0.01}
            onChange={(e) => setGlobalMultiplier(+e.target.value)}
          />
          <Button className="ml-4" onClick={() => updateMultiplier()}>
            Update multiplier
          </Button>
        </Flex>
        <Button
          className="mt-4"
          color={enabled ? 'red' : 'green'}
          onClick={() => {
            fetch('/api/update-rewards-enabled', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled: !enabled })
            }).then(() => window.location.reload());
          }}
        >
          {enabled ? 'Disable rewards' : 'Enable rewards'}
        </Button>
      </Flex>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Reward Token(s)</TableHeaderCell>
            <TableHeaderCell>Token Amount(s)</TableHeaderCell>
            <TableHeaderCell>Unverified Reward</TableHeaderCell>
            <TableHeaderCell>Verified (1.5x | 3x)</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {productGroups?.map((group) => (
            <TableRow key={group.key}>
              <TableCell>{group.name}</TableCell>
              <TableCell>
                <Text>{group.key}</Text>
              </TableCell>
              <TableCell>
                <Text>{getTokenDisplay(group)}</Text>
              </TableCell>
              <TableCell>
                <Text>{getAmountDisplay(group)}</Text>
              </TableCell>
              <TableCell>
                <Text>{group.reward.unverified}</Text>
              </TableCell>
              <TableCell>
                <Text>{`${
                  Math.round(group.reward.unverified * 100 * 1.5) / 100
                } | ${Math.round(group.reward.unverified * 100 * 3) / 100}`}</Text>
              </TableCell>
              <TableCell>
                <Button variant="secondary" onClick={() => openEditModal(group)}>
                  Edit All
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={!!editingGroup}
        onRequestClose={closeModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Edit Product Group"
      >
        <h2 className="mb-4">
          <strong>Editing</strong> {editingGroup?.name} ({editingGroup?.key})
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Changes apply to all product variants.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label>Unverified Reward:</label>
            <NumberInput
              ref={unverifiedRewardRef}
              defaultValue={editingGroup?.reward.unverified}
              step={0.01}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold text-white">Reward Tokens:</label>
            {rewardTokens.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded">
                <div className="flex-1">
                  <Select
                    value={row.asa_id}
                    onValueChange={(value) => updateTokenRow(idx, 'asa_id', value)}
                    placeholder="Select token"
                  >
                    <SelectItem value="">None</SelectItem>
                    {tokens?.map((token) => (
                      <SelectItem key={token.asset_id} value={token.asset_id}>
                        {token.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="w-32">
                  <NumberInput
                    value={row.amount}
                    step={0.01}
                    placeholder="Amount"
                    onChange={(e) => updateTokenRow(idx, 'amount', +e.target.value)}
                  />
                </div>
                {rewardTokens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTokenRow(idx)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTokenRow}
              className="flex items-center gap-1 mt-1 text-sm text-blue-400 hover:text-blue-300"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Add token
            </button>
          </div>

          <div className="mb-4 mt-4">
            <Button type="submit" className="mr-2" variant="primary">
              Update All
            </Button>
            <Button onClick={closeModal} variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
