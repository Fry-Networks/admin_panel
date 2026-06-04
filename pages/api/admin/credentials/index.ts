import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongoclient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = await clientPromise;
  const db = client.db('main');
  const credsDb = client.db('creds');

  const search = (req.query.search as string) || '';
  const category = (req.query.category as string) || 'all';

  try {
    const deviceQuery: any = {};
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      deviceQuery.$or = [
        { miner_key: searchRegex },
        { email: searchRegex },
        { order: searchRegex },
      ];
    }

    const devices = await db.collection('devices')
      .find(deviceQuery)
      .limit(200)
      .toArray();

    const categories = ['air', 'weather', 'energy', 'water', 'radiation', 'camera'];
    const allCredMinerKeys = new Set<string>();
    await Promise.all(categories.map(async (cat) => {
      const docs = await credsDb.collection(cat).find({}, { projection: { miner_key: 1 } }).toArray();
      for (const doc of docs) {
        if (doc.miner_key) allCredMinerKeys.add(doc.miner_key);
      }
    }));

    const devicesWithStatus: any[] = [];
    for (const device of devices) {
      const hasCredentials = allCredMinerKeys.has(device.miner_key);
      let deviceCategory: string | undefined;

      if (hasCredentials) {
        for (const cat of categories) {
          const doc = await credsDb.collection(cat).findOne(
            { miner_key: device.miner_key },
            { projection: { api_type: 1 } }
          );
          if (doc) {
            const config = require('@/lib/manufacturers').MANUFACTURER_CONFIG[doc.api_type];
            deviceCategory = config?.category || cat;
            break;
          }
        }
      }

      if (category !== 'all' && deviceCategory !== category) continue;

      devicesWithStatus.push({
        _id: device._id.toString(),
        miner_key: device.miner_key,
        name: device.name,
        order: device.order,
        email: device.email,
        category: deviceCategory,
        hasCredentials,
      });
    }

    res.status(200).json({ devices: devicesWithStatus });
  } catch (error) {
    console.error('Error fetching credentials list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
