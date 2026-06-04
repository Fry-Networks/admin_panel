import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth-options';
import { getEventModel } from '@/lib/events/eventModel';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ success: false, error: 'method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.admin) {
    return res.status(403).json({ success: false, error: 'admin required' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'invalid id' });
  }

  try {
    const EventModel = await getEventModel();
    const event = await EventModel.findById(id);
    if (!event)
      return res.status(404).json({ success: false, error: 'not found' });

    const prizeTiers = (event as any).prizeTiers ?? [];
    const leaderboard = ((event as any).leaderboard ?? [])
      .slice()
      .sort((a: any, b: any) => b.score - a.score);

    const declaredBy =
      session.user?.email ?? session.user?.name ?? 'admin';
    const now = new Date();

    // Map leaderboard positions to prize tiers by maxRank.
    // Sort tiers by maxRank ascending so highest tier assigns first.
    const sortedTiers = prizeTiers
      .slice()
      .sort((a: any, b: any) => a.maxRank - b.maxRank);

    const winners: Array<{
      wallet: string;
      rank: number;
      tier: string;
      declaredAt: Date;
      declaredBy: string;
    }> = [];

    for (let i = 0; i < leaderboard.length; i++) {
      const rank = i + 1;
      const entry = leaderboard[i];
      for (const tier of sortedTiers) {
        if (rank <= tier.maxRank) {
          winners.push({
            wallet: entry.wallet,
            rank,
            tier: tier.tier,
            declaredAt: now,
            declaredBy,
          });
          break; // Each wallet gets their best tier only
        }
      }
    }

    await EventModel.findByIdAndUpdate(id, {
      status: 'ended',
      winners,
    });

    const updated = await EventModel.findById(id).lean();
    return res
      .status(200)
      .json({ success: true, event: updated, winnersCount: winners.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ success: false, error: msg });
  }
}
