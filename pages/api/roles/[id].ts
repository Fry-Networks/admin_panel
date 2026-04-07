/**
 * Single Role API Route
 * GET /api/roles/[id] - Get a single role
 * PUT /api/roles/[id] - Update a role
 * DELETE /api/roles/[id] - Delete a role
 * 
 * Permission: admin:roles
 * Guards: System roles cannot be modified or deleted
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import RoleDefinitionModel from '@/lib/role-schema';
import WebUserModel from '@/lib/webusers-model';
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ message: 'Role ID is required' });
    return;
  }

  await connect();

  // Find the role
  const role = await RoleDefinitionModel.findById(id);
  if (!role) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ role: JSON.parse(JSON.stringify(role)) });
  } else if (req.method === 'PUT') {
    // Guard: System roles cannot be modified
    if (role.isSystem) {
      res.status(403).json({ message: 'System roles cannot be modified' });
      return;
    }

    try {
      const { name, description, permissions } = req.body;
      const updates: Record<string, any> = {};
      const oldValues: Record<string, any> = {};

      // Validate and collect updates
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({ message: 'Name must be a non-empty string' });
          return;
        }
        // Check if new name conflicts with existing role
        const existing = await RoleDefinitionModel.findOne({ 
          name: name.toLowerCase().trim(),
          _id: { $ne: id }
        });
        if (existing) {
          res.status(409).json({ message: 'A role with this name already exists' });
          return;
        }
        oldValues.name = role.name;
        updates.name = name.toLowerCase().trim();
      }

      if (description !== undefined) {
        if (typeof description !== 'string') {
          res.status(400).json({ message: 'Description must be a string' });
          return;
        }
        oldValues.description = role.description;
        updates.description = description.trim();
      }

      if (permissions !== undefined) {
        if (!Array.isArray(permissions)) {
          res.status(400).json({ message: 'Permissions must be an array' });
          return;
        }
        // Validate all permissions
        const invalidPermissions = permissions.filter(p => !ALL_PERMISSIONS.includes(p));
        if (invalidPermissions.length > 0) {
          res.status(400).json({ 
            message: 'Invalid permissions', 
            invalid: invalidPermissions 
          });
          return;
        }
        oldValues.permissions = role.permissions;
        updates.permissions = permissions;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ message: 'No valid updates provided' });
        return;
      }

      // Apply updates
      Object.assign(role, updates);
      await role.save();

      // Audit log
      await logAuditEvent(
        'role:update',
        'role-definitions',
        role._id.toString(),
        session.user.email || 'unknown',
        { oldValues, newValues: updates }
      );

      res.status(200).json({ 
        message: 'Role updated successfully',
        role: JSON.parse(JSON.stringify(role))
      });
    } catch (error: any) {
      console.error('Update role error:', error);
      res.status(500).json({ message: 'Error updating role', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    // Guard: System roles cannot be deleted
    if (role.isSystem) {
      res.status(403).json({ message: 'System roles cannot be deleted' });
      return;
    }

    try {
      // Check if any users have this role assigned
      const usersWithRole = await WebUserModel.countDocuments({ 
        roles: role.name 
      });
      if (usersWithRole > 0) {
        res.status(400).json({ 
          message: `Cannot delete role assigned to ${usersWithRole} user(s). Reassign them first.`,
          usersCount: usersWithRole
        });
        return;
      }

      // Delete the role
      await RoleDefinitionModel.deleteOne({ _id: id });

      // Audit log
      await logAuditEvent(
        'role:delete',
        'role-definitions',
        id,
        session.user.email || 'unknown',
        { roleName: role.name, permissions: role.permissions }
      );

      res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error: any) {
      console.error('Delete role error:', error);
      res.status(500).json({ message: 'Error deleting role', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
