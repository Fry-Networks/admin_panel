/**
 * Roles API Route
 * GET /api/roles - List all role definitions
 * POST /api/roles - Create a new custom role
 * 
 * Permission: admin:roles
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import RoleDefinitionModel from '@/lib/role-schema';
import { logAuditEvent } from '@/lib/audit-schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (req.method === 'GET') {
    try {
      const roles = await RoleDefinitionModel.find({}).sort({ isSystem: -1, name: 1 });
      res.status(200).json({ roles: JSON.parse(JSON.stringify(roles)) });
    } catch (error: any) {
      console.error('List roles error:', error);
      res.status(500).json({ message: 'Error listing roles', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, permissions } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ message: 'Name is required' });
        return;
      }

      if (!description || typeof description !== 'string') {
        res.status(400).json({ message: 'Description is required' });
        return;
      }

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

      // Check if name already exists (case-insensitive)
      const existing = await RoleDefinitionModel.findOne({ 
        name: name.toLowerCase().trim() 
      });
      if (existing) {
        res.status(409).json({ message: 'A role with this name already exists' });
        return;
      }

      // Create role (isSystem always false for user-created roles)
      const role = await RoleDefinitionModel.create({
        name: name.toLowerCase().trim(),
        description: description.trim(),
        permissions,
        isSystem: false,
        createdAt: new Date(),
        createdBy: session.user.email || 'unknown',
      });

      // Audit log
      await logAuditEvent(
        'role:create',
        'role-definitions',
        role._id.toString(),
        session.user.email || 'unknown',
        { roleName: role.name, permissions }
      );

      res.status(201).json({ 
        message: 'Role created successfully',
        role: JSON.parse(JSON.stringify(role))
      });
    } catch (error: any) {
      console.error('Create role error:', error);
      res.status(500).json({ message: 'Error creating role', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
