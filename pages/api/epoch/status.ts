import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.admin) return res.status(401).json({ error: 'unauthorized' });

  const url = process.env.FRYPOOL_TRIGGER_API_URL || 'http://100.108.101.109:8085';
  const token = process.env.FRYPOOL_TRIGGER_API_TOKEN || '';

  try {
    const resp = await fetch(`${url}/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(502).json({ error: 'trigger API unreachable', detail: e.message });
  }
}
