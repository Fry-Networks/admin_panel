import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { MongoClient } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.admin) return res.status(401).json({ error: 'unauthorized' });

  const uri = process.env.MONGO_URI || '';
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('main');
    const docs = await db.collection('reward_publish_log')
      .find({})
      .sort({ computed_at: -1 })
      .limit(20)
      .toArray();
    await client.close();
    return res.status(200).json(docs.map(d => ({
      ...d,
      _id: d._id.toString(),
    })));
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
