/**
 * Users API Route
 * GET /api/users - List all users with their roles
 * 
 * Permission: admin:roles
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import WebUserModel from '@/lib/webusers-model';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Check admin:roles permission
  const hasAccess = await hasPermission(session.user, PERMISSIONS.ADMIN_ROLES);
  if (!hasAccess) {
    res.status(403).json({ message: 'Forbidden - requires admin:roles permission' });
    return;
  }

  await connect();

  try {
    // Get all users, selecting only safe fields
    const users = await WebUserModel.find({})
      .select('_id name username email admin roles permissions')
      .sort({ name: 1 });

    res.status(200).json({ 
      users: JSON.parse(JSON.stringify(users)),
      total: users.length
    });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Error listing users', error: error.message });
  }
}
