/**
 * Audit Log API Route
 * GET /api/audit-log - Query audit log entries
 * 
 * Permission: admin:audit
 * 
 * Query params:
 * - page (default 1)
 * - limit (default 50, max 200)
 * - action (optional filter)
 * - targetType (optional filter)
 * - performedBy (optional filter)
 * - startDate (optional, ISO string)
 * - endDate (optional, ISO string)
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { connect } from '@/lib/connect';
import AuditLogModel from '@/lib/audit-schema';

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

  // Check admin:audit permission
  const hasAccess = await hasPermission(session.user, PERMISSIONS.ADMIN_AUDIT);
  if (!hasAccess) {
    res.status(403).json({ message: 'Forbidden - requires admin:audit permission' });
    return;
  }

  await connect();

  try {
    // Parse query params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const { action, targetType, performedBy, startDate, endDate } = req.query;

    // Build filter
    const filter: Record<string, any> = {};

    if (action && typeof action === 'string') {
      filter.action = action;
    }

    if (targetType && typeof targetType === 'string') {
      filter.targetType = targetType;
    }

    if (performedBy && typeof performedBy === 'string') {
      filter.performedBy = { $regex: performedBy, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate && typeof startDate === 'string') {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Include the end date
        filter.timestamp.$lte = end;
      }
    }

    // Get total count
    const total = await AuditLogModel.countDocuments(filter);

    // Get entries
    const entries = await AuditLogModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate pages
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      entries: JSON.parse(JSON.stringify(entries)),
      total,
      page,
      pages,
      limit,
    });
  } catch (error: any) {
    console.error('Audit log query error:', error);
    res.status(500).json({ message: 'Error querying audit log', error: error.message });
  }
}
