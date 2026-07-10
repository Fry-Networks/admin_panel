import {
  Card,
  Text,
  Title,
  Flex,
  TabPanel,
  TabPanels,
  TabGroup,
  TabList,
  Tab
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import RewardProductsTable from '../app/tables/table-reward-products';
import { getSession } from 'next-auth/react';
import { useState } from 'react';
import { Product } from '../lib/products-schema';
import { FryToken } from '../lib/tokens-schema';
import RewardHistory from '../components/reward-history';


function RewardModeToggle({ currentMode }: { currentMode: string }) {
  const [mode, setMode] = useState(currentMode || 'FRY2');
  const [syncing, setSyncing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState('');

  const handleToggle = (newMode: string) => {
    if (newMode === mode) return;
    setPendingMode(newMode);
    setShowConfirm(true);
  };

  const confirmSwitch = async () => {
    setSyncing(true);
    setShowConfirm(false);
    try {
      const res = await fetch('/api/sync-reward-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: pendingMode }),
      });
      if (res.ok) {
        setMode(pendingMode);
        alert(`Reward mode switched to ${pendingMode}. PoC.versions synced. On-chain RewardPool ref must match — see runbook.`);
      } else {
        const err = await res.json();
        alert(`Switch failed: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Switch failed: ${e.message}`);
    }
    setSyncing(false);
  };

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
      <div className="flex items-center gap-4">
        <span className="text-white font-semibold">Reward Mode:</span>
        <button
          onClick={() => handleToggle('FRY2')}
          disabled={syncing}
          className={`px-4 py-2 rounded ${mode === 'FRY2' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          FRY 2.0 (Legacy)
        </button>
        <button
          onClick={() => handleToggle('FRY3')}
          disabled={syncing}
          className={`px-4 py-2 rounded ${mode === 'FRY3' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          FRY 3.0 (Whitepaper)
        </button>
        <span className="text-sm text-gray-400">
          {mode === 'FRY3' ? 'ASA 3612979527' : 'ASA 2681521901 (tFRY)'}
        </span>
      </div>
      {showConfirm && (
        <div className="mt-3 p-3 bg-yellow-900 border border-yellow-600 rounded">
          <p className="text-yellow-200 text-sm">
            Switching to <strong>{pendingMode}</strong> will update the reward token network-wide.
            On-chain RewardPool ref must match — see runbook.
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={confirmSwitch} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
              Confirm Switch
            </button>
            <button onClick={() => setShowConfirm(false)} className="px-3 py-1 bg-gray-600 text-white rounded text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {syncing && <p className="mt-2 text-yellow-400 text-sm">Syncing PoC.versions...</p>}
    </div>
  );
}

export default function RewardsPage({
  productGroups,
  tokens,
  versionConfigMap,
  enabled,
  rewardMode
}: {
  productGroups: any[];
  tokens: FryToken[];
  versionConfigMap: Record<string, any>;
  enabled: boolean;
  rewardMode: string;
}) {
  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Reward Management & Review</Title>

      {/* FRY 2.0 ⇄ FRY 3.0 Reward Mode Toggle */}
      <RewardModeToggle currentMode={rewardMode} />
      <TabGroup>
        <TabList className="mt-8">
          <Tab>Rewards Options</Tab>
          <Tab>Rewards History</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex flexDirection="row" className="mt-6">
              <div className="mt-5">
                <Text className="text-gray-300">{productGroups?.length} product group(s) found!</Text>
              </div>
            </Flex>

            <Card className="mt-6 bg-gray-900 border-gray-700">
              <RewardProductsTable
                productGroups={productGroups}
                enabled={enabled}
                tokens={tokens}
                versionConfigMap={versionConfigMap}
              />
            </Card>
          </TabPanel>
          <TabPanel>
            <RewardHistory tokens={tokens} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const rawProducts = await db.collection('products').find({}).toArray();
    const config = await db.collection('configs').findOne({ name: 'rewards' });
    const rewardModeDoc = await db.collection('configs').findOne({ _id: 'reward_mode' } as any);
    const tokens = await db.collection('tokens').find({}).toArray();
    // Read reward config from PoC.versions (single source of truth)
    const pocDb = client.db('PoC');
    const versionDocs = await pocDb.collection('versions').find({}).toArray();
    const versionConfigMap: Record<string, any> = {};
    for (const vc of versionDocs) {
      if (vc.miner_code) {
        versionConfigMap[vc.miner_code] = {
          reward_amount: vc.reward_amount ?? null,
          reward_token_asa_id: vc.reward_token_asa_id ?? null,
          reward_token_name: vc.reward_token_name ?? null,
          reward_tokens: vc.reward_tokens ?? null,
        };
      }
    }


    // Group products by key for display (one row per product key)
    const groupMap: Record<string, any> = {};
    for (const p of rawProducts) {
      if (!groupMap[p.key]) {
        groupMap[p.key] = {
          key: p.key,
          name: p.display_name || p.name,
          variantCount: 0,
          // Use first non-zero reward as representative
          reward: { unverified: 0, verified: 0, tokens: p.reward?.tokens || {} },
        };
      }
      groupMap[p.key].variantCount++;
      if (p.reward?.unverified > 0 && groupMap[p.key].reward.unverified === 0) {
        groupMap[p.key].reward = p.reward;
      }
    }
    const productGroups = Object.values(groupMap);

    return {
      props: {
        productGroups: JSON.parse(JSON.stringify(productGroups)),
        tokens: JSON.parse(JSON.stringify(tokens)),
        versionConfigMap: JSON.parse(JSON.stringify(versionConfigMap)),
        enabled: config?.enabled,
        rewardMode: rewardModeDoc?.mode || 'FRY2'
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { error: 'Failed to fetch data' }
    };
  }
}
