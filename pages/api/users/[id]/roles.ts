/**
 * User Roles API Route
 * PUT /api/users/[id]/roles - Assign roles to a user
 * 
 * Permission: admin:roles
 * Guard: Cannot remove super-admin role from fryscrypto
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import WebUserModel from '@/lib/webusers-model';
import RoleDefinitionModel from '@/lib/role-schema';
import { logAuditEvent } from '@/lib/audit-schema';

// Protected Super Admin username
const SUPER_ADMIN_USERNAME = 'fryscrypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  await connect();

  // Find the user
  const user = await WebUserModel.findById(id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  try {
    const { roles } = req.body;

    // Validation
    if (!Array.isArray(roles)) {
      res.status(400).json({ message: 'Roles must be an array' });
      return;
    }

    // Validate all role names exist
    const existingRoles = await RoleDefinitionModel.find({ 
      name: { $in: roles.map((r: string) => r.toLowerCase()) }
    });
    const existingRoleNames = existingRoles.map(r => r.name);
    const invalidRoles = roles.filter((r: string) => 
      !existingRoleNames.includes(r.toLowerCase())
    );
    
    if (invalidRoles.length > 0) {
      res.status(400).json({ 
        message: 'Invalid role names', 
        invalid: invalidRoles,
        valid: existingRoleNames
      });
      return;
    }

    // Normalize role names to lowercase
    const normalizedRoles = roles.map((r: string) => r.toLowerCase());

    // Guard: Check if target user is fryscrypto and super-admin is being removed
    const isSuperAdmin = 
      user.name?.toLowerCase().includes(SUPER_ADMIN_USERNAME.toLowerCase()) ||
      user.email?.toLowerCase().includes(SUPER_ADMIN_USERNAME.toLowerCase());
    
    const currentHasSuperAdmin = user.roles?.includes('super-admin');
    const newHasSuperAdmin = normalizedRoles.includes('super-admin');

    if (isSuperAdmin && currentHasSuperAdmin && !newHasSuperAdmin) {
      res.status(403).json({ 
        message: 'Cannot remove Super Admin role from the Super Admin user' 
      });
      return;
    }

    // Store old roles for audit
    const oldRoles = user.roles || [];

    // Update roles
    user.roles = normalizedRoles;
    
    // Also update legacy admin flag based on roles
    // If user has super-admin, moderator, or viewer role, they should have admin=true
    user.admin = normalizedRoles.some((r: string) => 
      ['super-admin', 'moderator', 'viewer'].includes(r)
    );
    
    await user.save();

    // Audit log
    await logAuditEvent(
      'user:roles:update',
      'webusers',
      user._id.toString(),
      session.user.email || 'unknown',
      { 
        userName: user.name,
        userEmail: user.email,
        oldRoles, 
        newRoles: normalizedRoles 
      }
    );

    res.status(200).json({ 
      message: 'User roles updated',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        admin: user.admin,
      }
    });
  } catch (error: any) {
    console.error('Update user roles error:', error);
    res.status(500).json({ message: 'Error updating user roles', error: error.message });
  }
}
