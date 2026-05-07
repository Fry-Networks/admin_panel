import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongoclient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin) return res.status(401).json({ message: 'Unauthorized' });

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('devices');

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || 'all';
  const type = (req.query.type as string) || 'all';

  const filter: any = { virtual: true };

  if (status === 'pending') {
    filter.activated = false;
    filter.transitioned_at = null;
    filter.canceled_at = null;
  } else if (status === 'activated') {
    filter.activated = true;
    filter.transitioned_at = null;
    filter.canceled_at = null;
  } else if (status === 'transitioned') {
    filter.transitioned_at = { $ne: null };
  } else if (status === 'canceled') {
    filter.canceled_at = { $ne: null };
  }

  if (type !== 'all' && ['VRDN', 'VSDN', 'VSVN'].includes(type)) {
    filter.miner_key = { $regex: new RegExp('^' + type + '-') };
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { email: searchRegex },
      { miner_key: searchRegex },
      { order: searchRegex },
      { wix_order_id: searchRegex },
    ];
  }

  try {
    const [devices, total, statsAgg] = await Promise.all([
      collection.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter),
      collection.aggregate([
        { $match: { virtual: true } },
        { $facet: {
          total: [{ $count: 'count' }],
          pending: [{ $match: { activated: false, transitioned_at: null, canceled_at: null } }, { $count: 'count' }],
          activated: [{ $match: { activated: true, transitioned_at: null, canceled_at: null } }, { $count: 'count' }],
          transitioned: [{ $match: { transitioned_at: { $ne: null } } }, { $count: 'count' }],
          canceled: [{ $match: { canceled_at: { $ne: null } } }, { $count: 'count' }],
          byType: [
            { $addFields: { prefix: { $substr: ['$miner_key', 0, 4] } } },
            { $group: { _id: '$prefix', count: { $sum: 1 } } },
          ],
        }},
      ]).toArray(),
    ]);

    const s = statsAgg[0] || {};
    const stats = {
      total: s.total?.[0]?.count || 0,
      pending: s.pending?.[0]?.count || 0,
      activated: s.activated?.[0]?.count || 0,
      transitioned: s.transitioned?.[0]?.count || 0,
      canceled: s.canceled?.[0]?.count || 0,
      byType: Object.fromEntries((s.byType || []).map((t: any) => [t._id, t.count])),
    };

    res.status(200).json({
      devices: JSON.parse(JSON.stringify(devices)),
      total, page,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (error) {
    console.error('Error fetching virtual devices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
