import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from 'mongoose';

interface RewardTokenEntry {
  asa_id: string;
  amount: number;
  name: string;
}

interface ProductData {
  productId?: string;
  productKey?: string;
  unverifiedReward?: string;
  verifiedReward?: string;
  register_token?: string;
  register_price?: string;
  node_token?: string;
  node_price?: string;
  stake_one?: string;
  stake_two?: string;
  stake_one_usd?: string;
  stake_two_usd?: string;
  stake_token?: string;
  reward_token?: string;
  reward_amount?: string;
  rewards?: RewardTokenEntry[];
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('products');

  if (req.method === 'PUT') {
    const data: ProductData = req.body;
    const {
      productId,
      productKey,
      unverifiedReward,
      verifiedReward,
      node_token,
      node_price,
      stake_one,
      stake_two,
      stake_one_usd,
      stake_two_usd,
      register_token,
      register_price,
      stake_token,
      reward_token,
      reward_amount,
      rewards
    } = data;

    try {
      const updateData: any = {};
      if (register_token !== undefined)
        updateData['reward.tokens.register'] = register_token;
      if (register_price !== undefined)
        updateData['reward.stake.register'] = +register_price;
      if (node_token !== undefined)
        updateData['reward.tokens.node'] = node_token;
      if (node_price !== undefined)
        updateData['reward.stake.node'] = +node_price;
      if (unverifiedReward !== undefined)
        updateData['reward.unverified'] = +unverifiedReward;
      if (verifiedReward !== undefined)
        updateData['reward.verified'] = +verifiedReward;
      if (stake_one !== undefined)
        updateData['reward.stake.stake_one'] = +stake_one;
      if (stake_two !== undefined)
        updateData['reward.stake.stake_two'] = +stake_two;
      if (stake_one_usd !== undefined)
        updateData['reward.stake.stake_one_usd'] = +stake_one_usd;
      if (stake_two_usd !== undefined)
        updateData['reward.stake.stake_two_usd'] = +stake_two_usd;
      if (stake_token !== undefined)
        updateData['reward.tokens.stake'] = stake_token;
      if (reward_token !== undefined)
        updateData['reward.tokens.reward'] = reward_token;
      if (reward_amount !== undefined)
        updateData['reward.tokens.reward_amount'] = +reward_amount;

      // Multi-token: write rewards[] array alongside scalar fields
      if (rewards && rewards.length > 0) {
        updateData['reward.tokens.rewards'] = rewards;
        // Sync scalar fields from first entry for backwards compat
        updateData['reward.tokens.reward'] = rewards[0].asa_id;
        updateData['reward.tokens.reward_amount'] = rewards[0].amount;
      }

      if (productKey) {
        // Bulk mode: update all products with this key
        // Guard: reject variant-specific fields in bulk mode
        if (updateData['wix_id'] || updateData['type']) {
          res.status(400).json({ message: 'Cannot bulk-update variant-specific fields (wix_id, type)' });
          return;
        }

        await collection.updateMany({ key: productKey }, { $set: updateData });

        // Sync to PoC.versions for FEM pipeline
        const pocSync: Record<string, any> = {};
        if (reward_amount !== undefined)
          pocSync.reward_amount = +reward_amount;
        if (reward_token !== undefined && reward_token !== 'none') {
          pocSync.reward_token_asa_id = reward_token;
          const tokenDoc = await db.collection('tokens').findOne({ asset_id: reward_token });
          pocSync.reward_token_name = tokenDoc?.name ?? reward_token;
        }

        // Multi-token: also sync reward_tokens[] array to PoC.versions
        if (rewards && rewards.length > 0) {
          pocSync.reward_tokens = rewards;
          // Ensure scalar fields stay in sync from first entry
          pocSync.reward_token_asa_id = rewards[0].asa_id;
          pocSync.reward_amount = rewards[0].amount;
          pocSync.reward_token_name = rewards[0].name;
        }

        if (Object.keys(pocSync).length > 0) {
          const pocDb = client.db('PoC');
          await pocDb.collection('versions').updateOne(
            { miner_code: productKey },
            { $set: pocSync }
          );
        }

        res.status(200).json({ message: 'All variants updated successfully' });
      } else if (productId) {
        // Single-doc mode: update one product by wix_id
        const existingProduct = await collection.findOne({ wix_id: productId });
        if (!existingProduct) {
          res.status(404).json({ message: 'Product not found' });
          return;
        }

        await collection.updateOne({ wix_id: productId }, { $set: updateData });
        res.status(200).json({ message: 'Product updated successfully' });
      } else {
        res.status(400).json({ message: 'Either productId or productKey is required' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating product' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
