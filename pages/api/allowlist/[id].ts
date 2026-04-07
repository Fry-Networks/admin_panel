/**
 * Single Allowlist Entry API Route
 * PUT /api/allowlist/[id] - Update allowlist entry (toggle enabled, update notes)
 * DELETE /api/allowlist/[id] - Remove from allowlist
 * 
 * Permission: admin:roles
 * Guard: fryscrypto entry cannot be modified or removed
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import GitHubAllowlistModel from '@/lib/allowlist-schema';
import { logAuditEvent } from '@/lib/audit-schema';

// Protected Super Admin username
const SUPER_ADMIN_USERNAME = 'fryscrypto';

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
    res.status(400).json({ message: 'Entry ID is required' });
    return;
  }

  await connect();

  // Find the entry
  const entry = await GitHubAllowlistModel.findById(id);
  if (!entry) {
    res.status(404).json({ message: 'Allowlist entry not found' });
    return;
  }

  // Guard: fryscrypto cannot be modified or removed
  if (entry.githubUsername.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase()) {
    res.status(403).json({ 
      message: 'Cannot modify the Super Admin allowlist entry' 
    });
    return;
  }

  if (req.method === 'PUT') {
    try {
      const { enabled, notes } = req.body;
      const updates: Record<string, any> = {};
      const oldValues: Record<string, any> = {};

      if (enabled !== undefined) {
        if (typeof enabled !== 'boolean') {
          res.status(400).json({ message: 'Enabled must be a boolean' });
          return;
        }
        oldValues.enabled = entry.enabled;
        updates.enabled = enabled;
      }

      if (notes !== undefined) {
        if (typeof notes !== 'string') {
          res.status(400).json({ message: 'Notes must be a string' });
          return;
        }
        oldValues.notes = entry.notes;
        updates.notes = notes.trim();
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ message: 'No valid updates provided' });
        return;
      }

      // Apply updates
      Object.assign(entry, updates);
      await entry.save();

      // Audit log
      await logAuditEvent(
        'allowlist:update',
        'github-allowlist',
        entry._id.toString(),
        session.user.email || 'unknown',
        { 
          githubUsername: entry.githubUsername,
          oldValues, 
          newValues: updates 
        }
      );

      res.status(200).json({ 
        message: 'Allowlist entry updated',
        entry: JSON.parse(JSON.stringify(entry))
      });
    } catch (error: any) {
      console.error('Update allowlist error:', error);
      res.status(500).json({ message: 'Error updating allowlist entry', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const deletedUsername = entry.githubUsername;
      
      await GitHubAllowlistModel.deleteOne({ _id: id });

      // Audit log
      await logAuditEvent(
        'allowlist:remove',
        'github-allowlist',
        id,
        session.user.email || 'unknown',
        { githubUsername: deletedUsername }
      );

      res.status(200).json({ message: 'Removed from allowlist' });
    } catch (error: any) {
      console.error('Delete allowlist error:', error);
      res.status(500).json({ message: 'Error removing from allowlist', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
