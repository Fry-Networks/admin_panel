/**
 * WebUI Config API Route
 * GET /api/webuis - List all enabled WebUI entries (for iframe tab rendering)
 *
 * Permission: admin:roles
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import clientPromise from '@/lib/mongoclient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const hasAccess = await hasPermission(session.user, PERMISSIONS.ADMIN_ROLES);
  if (!hasAccess) {
    res.status(403).json({ message: 'Forbidden - requires admin:roles permission' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const webuis = await db
      .collection('adminWebuis')
      .find({ enabled: true })
      .sort({ order: 1 })
      .project({ slug: 1, label: 1, proxyPath: 1, order: 1, _id: 0 })
      .toArray();
    res.status(200).json({ webuis });
  } catch (error: any) {
    console.error('List webuis error:', error);
    res.status(500).json({ message: 'Error listing webuis', error: error.message });
  }
}
