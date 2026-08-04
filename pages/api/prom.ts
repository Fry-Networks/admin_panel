import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';

const PROM_URL = 'http://100.80.183.107:9090';

function promFetch(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'GET',
        timeout: 10000,
        headers: { Accept: 'application/json' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode || 500,
            data: Buffer.concat(chunks).toString(),
          })
        );
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Accept GET with base64 query param 'q', or POST with JSON body
  let query: string | undefined;
  let start: string | undefined;
  let end: string | undefined;
  let step: string | undefined;

  if (req.method === 'GET') {
    const q = req.query.q;
    if (typeof q === 'string') {
      try {
        query = Buffer.from(q, 'base64').toString('utf-8');
      } catch {
        return res.status(400).json({ error: 'Invalid base64 query' });
      }
    }
    start = typeof req.query.s === 'string' ? req.query.s : undefined;
    end = typeof req.query.e === 'string' ? req.query.e : undefined;
    step = typeof req.query.step === 'string' ? req.query.step : undefined;
  } else if (req.method === 'POST') {
    const body = req.body || {};
    query = body.query;
    start = body.start ? String(body.start) : undefined;
    end = body.end ? String(body.end) : undefined;
    step = body.step ? String(body.step) : undefined;
  } else {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query' });
  }

  const params = new URLSearchParams({ query });
  let path = '/api/v1/query';

  if (start && end && step) {
    path = '/api/v1/query_range';
    params.set('start', start);
    params.set('end', end);
    params.set('step', step);
  }

  try {
    const result = await promFetch(`${PROM_URL}${path}?${params}`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.status(result.status).end(result.data);
  } catch {
    res.status(502).json({ error: 'Prometheus unreachable' });
  }
}
