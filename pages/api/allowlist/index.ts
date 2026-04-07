/**
 * Allowlist API Route
 * GET /api/allowlist - List all allowlist entries
 * POST /api/allowlist - Add a GitHub username to allowlist
 * 
 * Permission: admin:roles
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import GitHubAllowlistModel from '@/lib/allowlist-schema';
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
      const entries = await GitHubAllowlistModel.find({}).sort({ addedAt: -1 });
      res.status(200).json({ entries: JSON.parse(JSON.stringify(entries)) });
    } catch (error: any) {
      console.error('List allowlist error:', error);
      res.status(500).json({ message: 'Error listing allowlist', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { githubUsername, notes } = req.body;

      // Validation
      if (!githubUsername || typeof githubUsername !== 'string' || githubUsername.trim().length === 0) {
        res.status(400).json({ message: 'GitHub username is required' });
        return;
      }

      const normalizedUsername = githubUsername.toLowerCase().trim();

      // Check if already exists (case-insensitive)
      const existing = await GitHubAllowlistModel.findOne({ 
        githubUsername: normalizedUsername 
      });
      if (existing) {
        res.status(409).json({ 
          message: 'This GitHub username is already in the allowlist',
          existing: JSON.parse(JSON.stringify(existing))
        });
        return;
      }

      // Create entry
      const entry = await GitHubAllowlistModel.create({
        githubUsername: normalizedUsername,
        addedBy: session.user.email || 'unknown',
        addedAt: new Date(),
        notes: notes?.trim() || '',
        enabled: true,
      });

      // Audit log
      await logAuditEvent(
        'allowlist:add',
        'github-allowlist',
        entry._id.toString(),
        session.user.email || 'unknown',
        { githubUsername: normalizedUsername, notes: notes?.trim() || '' }
      );

      res.status(201).json({ 
        message: 'GitHub user added to allowlist',
        entry: JSON.parse(JSON.stringify(entry))
      });
    } catch (error: any) {
      console.error('Add to allowlist error:', error);
      res.status(500).json({ message: 'Error adding to allowlist', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
