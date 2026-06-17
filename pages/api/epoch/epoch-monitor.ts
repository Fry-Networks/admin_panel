import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.admin) return res.status(401).json({ error: 'unauthorized' });

  const url = process.env.FRYPOOL_MONITOR_URL || 'http://100.80.231.71:9101';
  const token = process.env.FRYPOOL_MONITOR_TOKEN || '';

  if (req.method === 'GET') {
    try {
      const resp = await fetch(`${url}/mode`);
      const data = await resp.json();
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(502).json({ error: 'monitor unreachable' });
    }
  } else if (req.method === 'POST') {
    try {
      const resp = await fetch(`${url}/mode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      const data = await resp.json();
      return res.status(resp.status).json(data);
    } catch (e: any) {
      return res.status(502).json({ error: 'monitor unreachable' });
    }
  }
  return res.status(405).end();
}
