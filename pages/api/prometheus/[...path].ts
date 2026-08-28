import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const PROMETHEUS_URL = 'http://100.80.183.107:9090';

const ALLOWED_PATHS = [
  /^\/api\/v1\/query$/,
  /^\/api\/v1\/query_range$/,
  /^\/api\/v1\/targets$/,
  /^\/api\/v1\/label\/[^/]+\/values$/,
];

export const config = {
  api: { bodyParser: false }
};

function promRequest(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 10000,
        headers: { Accept: 'application/json' }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, data: Buffer.concat(chunks).toString() });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Prometheus request timed out'));
    });
    req.end();
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pathSegments = req.query.path;
  const path = '/' + (Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '');

  if (!ALLOWED_PATHS.some((p) => p.test(path))) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  // Rebuild query string without the catch-all path param
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (typeof val === 'string') qs.set(key, val);
  }
  const queryStr = qs.toString();
  const fullUrl = `${PROMETHEUS_URL}${path}${queryStr ? '?' + queryStr : ''}`;

  try {
    const result = await promRequest(fullUrl);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status);
    res.setHeader('Content-Type', 'application/json');
    res.end(result.data);
  } catch {
    res.status(502).json({ error: 'Prometheus unreachable' });
  }
}
