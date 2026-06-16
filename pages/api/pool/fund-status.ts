import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import algosdk from 'algosdk';

const POOL_APP_ID = 3592975326;
const POOL_APP_ADDRESS = algosdk.getApplicationAddress(POOL_APP_ID);

const ALGOD_BASE =
  process.env.ALGOD_INTERNAL_URL || 'https://mainnet-api.algonode.cloud';

async function algodFetch(path: string) {
  const url = `${ALGOD_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'X-Algo-API-Token': process.env.ALGOD_TOKEN || '' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`algod ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function decodeGlobalState(
  globalState: Array<{ key: string; value: { type: number; uint: number; bytes: string } }>
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const kv of globalState) {
    const keyBytes = Buffer.from(kv.key, 'base64');
    let keyStr: string;
    try {
      keyStr = keyBytes.toString('utf8');
    } catch {
      keyStr = '0x' + keyBytes.toString('hex');
    }
    if (kv.value.type === 2) {
      out[keyStr] = kv.value.uint;
    } else {
      // Bytes value — decode as address if 32 bytes
      const raw = Buffer.from(kv.value.bytes, 'base64');
      if (raw.length === 32) {
        out[keyStr] = algosdk.encodeAddress(new Uint8Array(raw));
      } else {
        out[keyStr] = '0x' + raw.toString('hex');
      }
    }
  }
  return out;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Fetch account info (ALGO + assets)
    const acctData = await algodFetch(`/v2/accounts/${POOL_APP_ADDRESS}`);
    const algo: number = acctData.amount ?? 0;
    const rawAssets: Array<{ 'asset-id': number; amount: number }> =
      acctData.assets ?? [];

    // Fetch app global state
    const appData = await algodFetch(`/v2/applications/${POOL_APP_ID}`);
    const gs = decodeGlobalState(appData.params?.['global-state'] ?? []);

    // Fetch asset details for each opted-in asset
    const assets = await Promise.all(
      rawAssets.map(async (a) => {
        try {
          const assetData = await algodFetch(`/v2/assets/${a['asset-id']}`);
          const params = assetData.params ?? {};
          return {
            id: a['asset-id'],
            balance: String(a.amount),
            decimals: params.decimals ?? 0,
            name: params.name ?? `ASA #${a['asset-id']}`,
            unitName: params['unit-name'] ?? '',
          };
        } catch {
          return {
            id: a['asset-id'],
            balance: String(a.amount),
            decimals: 0,
            name: `ASA #${a['asset-id']}`,
            unitName: '',
          };
        }
      })
    );

    return res.status(200).json({
      appId: POOL_APP_ID,
      appAddress: POOL_APP_ADDRESS,
      algo,
      assets,
      optedInAssetIds: rawAssets.map((a) => a['asset-id']),
      admin: (gs.admin as string) ?? 'unknown',
      owner: (gs.owner as string) ?? 'unknown',
      currentEpoch: (gs.current_epoch as number) ?? 0,
      paused: gs.paused === 1,
    });
  } catch (err: any) {
    console.error('[fund-status]', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch pool state', error: err.message });
  }
}
