/**
 * Permissions API Route
 * GET /api/permissions - List all available permission definitions
 * 
 * Permission: admin:roles
 * 
 * Returns permissions grouped by category for UI display in role creation forms.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS, PERMISSION_CATEGORIES } from '@/lib/permissions';

// Human-readable names for permissions
const PERMISSION_NAMES: Record<string, string> = {
  'users:read': 'View Users',
  'users:write': 'Edit Users',
  'users:delete': 'Delete Users',
  'devices:read': 'View Devices',
  'devices:write': 'Edit Devices',
  'devices:delete': 'Delete Devices',
  'devices:stake': 'Manage Device Staking',
  'devices:refund': 'Process Device Refunds',
  'dao:read': 'View DAO Proposals',
  'dao:write': 'Create/Edit DAO Proposals',
  'dao:vote': 'Vote on DAO Proposals',
  'dao:admin': 'Administer DAO',
  'fryworld:read': 'View fry.farm Config',
  'fryworld:config': 'Edit fry.farm Config',
  'fryworld:events': 'Manage fry.farm Events',
  'fryworld:pools': 'Manage fry.farm Pools',
  'tokens:read': 'View Tokens',
  'tokens:write': 'Manage Tokens',
  'prices:read': 'View Prices',
  'prices:write': 'Manage Prices',
  'admin:roles': 'Manage Roles & Users',
  'admin:audit': 'View Audit Log',
  'admin:settings': 'Manage System Settings',
};

// Human-readable category names
const CATEGORY_NAMES: Record<string, string> = {
  users: 'User Management',
  devices: 'Device Management',
  dao: 'Governance (DAO)',
  fryworld: 'fry.farm',
  tokens: 'Token Management',
  prices: 'Price Management',
  admin: 'System Administration',
};

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

  // Build categorized permission list
  const categories = Object.entries(PERMISSION_CATEGORIES).map(([key, permissions]) => ({
    key,
    name: CATEGORY_NAMES[key] || key,
    permissions: permissions.map(perm => ({
      key: perm,
      name: PERMISSION_NAMES[perm] || perm,
    })),
  }));

  res.status(200).json({ categories });
}
