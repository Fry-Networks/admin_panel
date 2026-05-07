import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongoclient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin) return res.status(401).json({ message: 'Unauthorized' });

  const { virtual_miner_key, physical_miner_key } = req.body;
  if (!virtual_miner_key || !physical_miner_key) {
    return res.status(400).json({ message: 'virtual_miner_key and physical_miner_key required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const device = await db.collection('devices').findOne({ miner_key: virtual_miner_key, virtual: true });

    if (!device) return res.status(404).json({ message: 'Virtual device not found' });
    if (!device.activated) return res.status(409).json({ message: 'Device must be activated before transition' });
    if (device.transitioned_at) return res.status(409).json({ message: 'Device already transitioned' });

    const result = await db.collection('devices').findOneAndUpdate(
      { miner_key: virtual_miner_key, virtual: true },
      { $set: { transitioned_at: new Date(), transitioned_to_device: physical_miner_key, activated: false } },
      { returnDocument: 'after' }
    );

    res.status(200).json({ device: JSON.parse(JSON.stringify(result)) });
  } catch (error) {
    console.error('Error transitioning virtual device:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
