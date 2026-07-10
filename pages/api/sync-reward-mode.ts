import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

const FRY_2_0_ASA_ID = 2485314946;
const FRY_3_0_ASA_ID = 3612979527;
const TFRY_ASA_ID = 2681521901;

interface SyncResponse {
  success?: boolean;
  message?: string;
  error?: string;
  updated_count?: number;
}

/**
 * Admin API endpoint to update reward_mode and sync PoC.versions across all miner_codes.
 *
 * Request body:
 * {
 *   "mode": "FRY2" | "FRY3",
 *   "force": boolean (optional, default false - if true, sync even if mode unchanged)
 * }
 *
 * Actions:
 * 1. Update main.configs.reward_mode.mode
 * 2. Sync all miner_codes in PoC.versions to set reward_token_asa_id + reward_tokens[]
 *    - FRY3 mode: reward_tokens = [{asa_id: FRY3, amount: existing, name: "FRY3"}]
 *    - FRY2 mode: restore reward_tokens from main.products rewards[] array
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // GET: Return current reward_mode (no auth for reads)
  if (req.method === 'GET') {
    try {
      const client = await clientPromise;
      const db = client.db('main');
      const modeDoc = await db.collection('configs').findOne({ _id: 'reward_mode' } as any);
      const mode = modeDoc?.mode || 'FRY2';
      const activeFryAsaId = mode === 'FRY3' ? String(FRY_3_0_ASA_ID) : String(FRY_2_0_ASA_ID);
      return (res as any).status(200).json({ mode, active_fry_asa_id: activeFryAsaId });
    } catch {
      return (res as any).status(200).json({ mode: "FRY2", active_fry_asa_id: String(FRY_2_0_ASA_ID) });
    }
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.admin) {
    return res.status(401).json({ error: 'Unauthorized: admin access required' });
  }

  const { mode, force } = req.body;
  if (!mode || !['FRY2', 'FRY3'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode: must be FRY2 or FRY3' });
  }

  try {
    const client = await clientPromise;
    const mainDb = client.db('main');
    const pocDb = client.db('PoC');

    // Step 1: Update main.configs
    const configsCollection = mainDb.collection('configs');
    const newConfig = await configsCollection.findOneAndUpdate(
      {},
      {
        $set: {
          'reward_mode.mode': mode,
          'reward_mode.updated_at': new Date(),
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!newConfig?.value) {
      throw new Error('Failed to update reward_mode in main.configs');
    }

    // Step 2: Determine target ASA ID
    const targetAsaId = mode === 'FRY3' ? FRY_3_0_ASA_ID : FRY_2_0_ASA_ID;
    const versionsCollection = pocDb.collection('versions');

    if (mode === 'FRY3') {
      // FRY3 flip: set reward_tokens[] to single FRY3 entry per miner_code
      // Use aggregation pipeline to preserve each doc's reward_amount
      const syncResult = await versionsCollection.updateMany(
        {},
        [{
          $set: {
            reward_token_asa_id: String(FRY_3_0_ASA_ID),
            reward_token_name: 'FRY3',
            reward_tokens: [{
              asa_id: String(FRY_3_0_ASA_ID),
              amount: '$reward_amount',
              name: 'FRY3'
            }],
            synced_at: new Date(),
            sync_mode: 'FRY3',
          }
        }]
      );

      console.log(`[sync-reward-mode] FRY3: synced ${syncResult.modifiedCount} version records`);
      return res.status(200).json({
        success: true,
        message: `Reward mode synced to FRY3`,
        updated_count: syncResult.modifiedCount
      });
    } else {
      // FRY2 flip: restore reward_tokens from main.products rewards[] array
      // For each miner_code, look up the matching product's rewards[]
      const products = await mainDb.collection('products').aggregate([
        { $group: { _id: '$key', rewards: { $first: '$reward.tokens.rewards' }, reward: { $first: '$reward.tokens.reward' }, reward_amount: { $first: '$reward.tokens.reward_amount' } } }
      ]).toArray();

      let updatedCount = 0;
      for (const prod of products) {
        const syncData: Record<string, any> = {
          synced_at: new Date(),
          sync_mode: 'FRY2',
        };

        if (prod.rewards && prod.rewards.length > 0) {
          // Restore from multi-token array
          syncData.reward_tokens = prod.rewards;
          syncData.reward_token_asa_id = prod.rewards[0].asa_id;
          syncData.reward_token_name = prod.rewards[0].name;
          syncData.reward_amount = prod.rewards[0].amount;
        } else if (prod.reward) {
          // Restore from scalar
          syncData.reward_token_asa_id = prod.reward;
          if (prod.reward_amount) syncData.reward_amount = prod.reward_amount;
        }

        const r = await versionsCollection.updateOne(
          { miner_code: prod._id },
          { $set: syncData }
        );
        updatedCount += r.modifiedCount;
      }

      console.log(`[sync-reward-mode] FRY2: synced ${updatedCount} version records`);
      return res.status(200).json({
        success: true,
        message: `Reward mode synced to FRY2`,
        updated_count: updatedCount
      });
    }
  } catch (error) {
    console.error(`[sync-reward-mode] Error: ${error}`);
    return res.status(500).json({ error: `Sync failed: ${String(error)}` });
  }
}
