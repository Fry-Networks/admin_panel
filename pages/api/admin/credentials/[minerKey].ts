import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongoclient';
import { MANUFACTURER_CONFIG } from '@/lib/manufacturers';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(adminId);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  return true;
}

function maskCredentials(apiType: string, credentials: Record<string, string>): Record<string, string> {
  const config = MANUFACTURER_CONFIG[apiType];
  if (!config) return credentials;
  const masked: Record<string, string> = {};
  for (const field of config.fields) {
    const value = credentials[field.name] || '';
    if (field.type === 'password' && value.length > 4) {
      masked[field.name] = value.slice(0, 4) + '...';
    } else {
      masked[field.name] = value;
    }
  }
  return masked;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { minerKey } = req.query;
  if (!minerKey || typeof minerKey !== 'string') {
    return res.status(400).json({ message: 'Invalid miner key' });
  }

  const client = await clientPromise;

  if (req.method === 'GET') {
    try {
      const categories = ['air', 'weather', 'energy', 'water', 'radiation', 'camera'];
      let found: { api_type: string; credentials: Record<string, string>; credentials_saved_at?: Date } | null = null;

      const credsDb = client.db('creds');
      for (const category of categories) {
        const doc = await credsDb.collection(category).findOne({ miner_key: minerKey });
        if (doc) {
          found = {
            api_type: doc.api_type,
            credentials: doc.credentials || {},
            credentials_saved_at: doc.credentials_saved_at,
          };
          break;
        }
      }

      if (!found) {
        return res.status(200).json({ api_type: null, credentials: {} });
      }

      return res.status(200).json({
        api_type: found.api_type,
        credentials: maskCredentials(found.api_type, found.credentials),
        credentials_saved_at: found.credentials_saved_at ? found.credentials_saved_at.toISOString() : undefined,
      });
    } catch (error) {
      console.error('Error fetching credentials:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const adminId = (session.user as any).id || session.user.email || 'unknown';
    if (!checkRateLimit(adminId)) {
      return res.status(429).json({ message: 'Rate limit exceeded: 30 updates per hour' });
    }

    const { api_type, credentials } = req.body;
    if (!api_type || typeof api_type !== 'string') {
      return res.status(400).json({ message: 'api_type is required' });
    }

    const config = MANUFACTURER_CONFIG[api_type];
    if (!config) {
      return res.status(400).json({ message: 'Invalid api_type' });
    }

    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({ message: 'credentials object is required' });
    }

    const missingFields = config.fields
      .filter(f => f.required && !credentials[f.name]?.trim())
      .map(f => f.name);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    try {
      const credsDb = client.db('creds');
      const collection = credsDb.collection(config.category);

      await collection.updateOne(
        { miner_key: minerKey },
        {
          $set: {
            miner_key: minerKey,
            api_type,
            credentials,
            credentials_saved_at: new Date(),
          }
        },
        { upsert: true }
      );

      return res.status(200).json({ message: 'Credentials updated' });
    } catch (error) {
      console.error('Error updating credentials:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
