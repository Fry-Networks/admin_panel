import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const url = process.env.CLUSTER_API_URL;
  const key = process.env.CLUSTER_API_KEY;
  if (!url || !key) {
    res.status(500).json({ message: 'cluster-control not configured' });
    return;
  }

  try {
    const upstream = await fetch(`${url}/status`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      res
        .status(502)
        .json({ message: `upstream ${upstream.status}`, detail: await upstream.text() });
      return;
    }
    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ message: 'upstream error', detail: String(err) });
  }
}
