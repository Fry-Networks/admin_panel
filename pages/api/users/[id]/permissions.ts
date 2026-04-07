/**
 * User Permissions API Route
 * PUT /api/users/[id]/permissions - Set direct permission overrides for a user
 * 
 * Permission: admin:roles
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import WebUserModel from '@/lib/webusers-model';
import { logAuditEvent } from '@/lib/audit-schema';

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
    const { permissions } = req.body;

    // Validation
    if (!Array.isArray(permissions)) {
      res.status(400).json({ message: 'Permissions must be an array' });
      return;
    }

    // Validate all permissions are valid
    const invalidPermissions = permissions.filter(p => !ALL_PERMISSIONS.includes(p));
    if (invalidPermissions.length > 0) {
      res.status(400).json({ 
        message: 'Invalid permissions', 
        invalid: invalidPermissions,
        valid: ALL_PERMISSIONS 
      });
      return;
    }

    // Store old permissions for audit
    const oldPermissions = user.permissions || [];

    // Update permissions
    user.permissions = permissions;
    await user.save();

    // Audit log
    await logAuditEvent(
      'user:permissions:update',
      'webusers',
      user._id.toString(),
      session.user.email || 'unknown',
      { 
        userName: user.name,
        userEmail: user.email,
        oldPermissions, 
        newPermissions: permissions 
      }
    );

    res.status(200).json({ 
      message: 'User permissions updated',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        permissions: user.permissions,
      }
    });
  } catch (error: any) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ message: 'Error updating user permissions', error: error.message });
  }
}
