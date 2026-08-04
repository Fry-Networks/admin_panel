import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getEventModel } from '@/lib/events/eventModel';
import { startAutoRefresh } from '@/lib/events/autoRefreshScheduler';

// Start auto-refresh on first API route hit (idempotent — only starts once)
if (typeof window === 'undefined') {
  startAutoRefresh();
}

type ApiResponse =
  | { success: true; events: unknown[] }
  | { success: true; event: unknown }
  | { success: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.admin) {
    return res.status(403).json({ success: false, error: 'admin required' });
  }

  try {
    const EventModel = await getEventModel();

    if (req.method === 'GET') {
      const status =
        typeof req.query.status === 'string' ? req.query.status : undefined;
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      const events = await EventModel.find(filter)
        .sort({ created_at: -1 })
        .lean();
      return res.status(200).json({ success: true, events });
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const required = ['name', 'startDate', 'endDate', 'status'];
      for (const f of required) {
        if (body[f] === undefined || body[f] === null || body[f] === '') {
          return res
            .status(400)
            .json({ success: false, error: `missing field: ${f}` });
        }
      }

      // Accept metric as string or object { type: string, config?: ... }
      const metricInput = body.metric;
      let metricType: string;
      let metricConfig: Record<string, unknown> | undefined;
      if (typeof metricInput === 'string') {
        metricType = metricInput;
      } else if (metricInput && typeof metricInput === 'object') {
        metricType = metricInput.type;
        metricConfig = metricInput.config;
      } else {
        return res
          .status(400)
          .json({ success: false, error: 'missing field: metric' });
      }

      const allowedMetrics = ['manual', 'device_count'];
      if (!allowedMetrics.includes(metricType)) {
        return res.status(400).json({
          success: false,
          error: `metric must be one of ${allowedMetrics.join(', ')}`,
        });
      }
      const allowedStatuses = ['draft', 'active', 'ended', 'cancelled'];
      if (!allowedStatuses.includes(body.status)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of ${allowedStatuses.join(', ')}`,
        });
      }

      // Prize is required by the Event schema; validate here so incomplete input returns 400 (not a mongoose 500).
      const prizeInput = body.prize;
      if (
        !prizeInput ||
        typeof prizeInput !== 'object' ||
        typeof prizeInput.type !== 'string' ||
        prizeInput.type.trim() === '' ||
        typeof prizeInput.amount !== 'number' ||
        Number.isNaN(prizeInput.amount)
      ) {
        return res.status(400).json({
          success: false,
          error: 'prize.type (non-empty string) and prize.amount (number) are required',
        });
      }

      const created_by =
        session.user?.email ?? session.user?.name ?? 'admin';

      // Build metric object with optional refresh config
      const refreshIntervalMinutes =
        typeof body.refreshIntervalMinutes === 'number'
          ? body.refreshIntervalMinutes
          : 60;
      const metric: Record<string, unknown> = {
        type: metricType,
        config: {
          ...(metricConfig ?? {}),
          refreshIntervalMinutes,
        },
      };

      const doc = await EventModel.create({
        name: body.name,
        description: body.description,
        status: body.status,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        prize: body.prize,
        metric,
        bannerImage: body.bannerImage,
        ctaLink: body.ctaLink,
        audience: body.audience,
        prizeTiers: body.prizeTiers,
        waivedRequirements: body.waivedRequirements,
        created_by,
      });
      return res.status(201).json({ success: true, event: doc.toObject() });
    }

    res.setHeader('Allow', 'GET, POST');
    return res
      .status(405)
      .json({ success: false, error: 'method not allowed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ success: false, error: msg });
  }
}
