import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth-options';
import { refreshEventLeaderboard } from '@/lib/events/refreshLeaderboard';

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
    const result = await refreshEventLeaderboard(id);
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error,
        leaderboard: result.leaderboard,
      });
    }
    return res
      .status(200)
      .json({ success: true, leaderboard: result.leaderboard });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ success: false, error: msg });
  }
}
