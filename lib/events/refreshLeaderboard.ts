import { eventsConnect } from './connect';

// Count only registered + actively-earning AEMs per wallet.
// Active = any poc_reward_dailies record within the last 14 days.
const ACTIVE_THRESHOLD_DAYS = 14;

async function fetchAemCounts(): Promise<Array<{ wallet: string; score: number }>> {
  const conn = await eventsConnect();
  const db = conn.db!;
  const devicesCol = db.collection('devices');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_THRESHOLD_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const results = await devicesCol
    .aggregate([
      {
        $match: {
          miner_key: /^AEM/,
          'registration.time': { $exists: true },
          'registration.amount': { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: 'poc_reward_dailies',
          let: { mk: '$miner_key' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$miner_key', '$$mk'] },
                date: { $gte: cutoffStr },
              },
            },
            { $limit: 1 },
          ],
          as: 'recentRewards',
        },
      },
      { $match: { 'recentRewards.0': { $exists: true } } },
      { $group: { _id: '$address', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  return results.map((r) => ({
    wallet: r._id as string,
    score: r.count as number,
  }));
}

async function fetchAllDeviceCounts(): Promise<
  Array<{ wallet: string; score: number }>
> {
  const conn = await eventsConnect();
  const db = conn.db!;
  const devicesCol = db.collection('devices');
  const results = await devicesCol
    .aggregate([
      { $group: { _id: '$address', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  return results.map((r) => ({
    wallet: r._id as string,
    score: r.count as number,
  }));
}

export async function refreshEventLeaderboard(eventId: string): Promise<{
  leaderboard: Array<{
    wallet: string;
    score: number;
    lastCalculated: Date;
    source: string;
  }>;
  error?: string;
}> {
  const { getEventModel } = await import('./eventModel');
  const EventModel = await getEventModel();
  const event = await EventModel.findById(eventId);
  if (!event) throw new Error('Event not found');
  if (event.status === 'cancelled')
    throw new Error('Cannot refresh cancelled event');

  const metricType = (event.metric as any)?.type;
  if (metricType === 'manual')
    throw new Error('Cannot auto-refresh manual metric events');

  const now = new Date();
  try {
    let entries: Array<{ wallet: string; score: number }>;
    if (metricType === 'aem_count') {
      entries = await fetchAemCounts();
    } else if (metricType === 'device_count') {
      entries = await fetchAllDeviceCounts();
    } else {
      throw new Error(`Unknown metric type: ${metricType}`);
    }

    const leaderboard = entries.map((e) => ({
      wallet: e.wallet,
      score: e.score,
      lastCalculated: now,
      source: 'auto' as const,
    }));

    const refreshInterval =
      (event.metric as any)?.config?.refreshIntervalMinutes ?? 60;
    const nextRefreshAt = new Date(
      now.getTime() + refreshInterval * 60 * 1000
    );

    await EventModel.findByIdAndUpdate(eventId, {
      leaderboard,
      'metric.lastRefreshAt': now,
      'metric.lastRefreshStatus': 'ok',
      'metric.lastRefreshError': null,
      'metric.nextRefreshAt': nextRefreshAt,
    });

    return { leaderboard };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'unknown error';
    await EventModel.findByIdAndUpdate(eventId, {
      'metric.lastRefreshAt': now,
      'metric.lastRefreshStatus': 'failed',
      'metric.lastRefreshError': errorMsg,
    }).catch(() => {});
    return { leaderboard: [], error: errorMsg };
  }
}

export async function refreshAllActiveEvents(): Promise<void> {
  const { getEventModel } = await import('./eventModel');
  const EventModel = await getEventModel();
  const now = new Date();
  const events = await EventModel.find({
    status: 'active',
    'metric.type': { $ne: 'manual' },
    $or: [
      { 'metric.nextRefreshAt': { $lte: now } },
      { 'metric.nextRefreshAt': { $exists: false } },
    ],
  })
    .select('_id')
    .lean();

  for (const event of events) {
    try {
      await refreshEventLeaderboard(event._id.toString());
    } catch (err) {
      console.error(`[autoRefresh] failed for event ${event._id}:`, err);
    }
  }
}
