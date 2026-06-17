/**
 * Server-side algod client with ATLAS00 primary + Nodely fallback.
 * Used by getServerSideProps and API routes.
 */

const ALGOD_PRIMARY = 'http://192.168.9.2:8080';
const ALGOD_FALLBACK = 'https://mainnet-api.4160.nodely.dev';

async function algodFetch(path: string): Promise<any> {
  const token = process.env.ALGOD_TOKEN || '';
  const urls = [ALGOD_PRIMARY, ALGOD_FALLBACK];
  for (const url of urls) {
    try {
      const res = await fetch(url + path, {
        headers: token ? { 'X-Algo-API-Token': token } : {},
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`[algod-server] ${url} failed:`, e);
    }
  }
  throw new Error('Algod fetch failed on all endpoints');
}

function decodeV2VoteBox(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset);
  return {
    endTime: Number(view.getBigUint64(40, false)),
    lockDuration: Number(view.getBigUint64(48, false)),
    numOptions: Number(view.getBigUint64(56, false)),
    totalTokens: Array.from({ length: 4 }, (_, i) => view.getBigUint64(72 + i * 8, false).toString()),
    totalVoters: Array.from({ length: 14 }, (_, i) => view.getBigUint64(104 + i * 8, false).toString()),
  };
}

function decodeV1VoteBox(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset);
  return {
    endTime: Number(view.getBigUint64(33, false)),
    lockDuration: Number(view.getBigUint64(41, false)),
    numOptions: data[32],
    totalTokens: Array.from({ length: 8 }, (_, i) => view.getBigUint64(92 + i * 8, false).toString()),
    totalVoters: Array.from({ length: 8 }, (_, i) => view.getBigUint64(156 + i * 8, false).toString()),
  };
}

export async function fetchVoteBoxOnChain(
  voteIdHex: string
): Promise<{ source: string; tallies: any } | null> {
  const voteIdBytes = Uint8Array.from(Buffer.from(voteIdHex, 'hex'));
  const prefix = new Uint8Array([0x76]);
  const boxName = new Uint8Array(prefix.length + voteIdBytes.length);
  boxName.set(prefix, 0);
  boxName.set(voteIdBytes, prefix.length);
  const b64Name = Buffer.from(boxName).toString('base64');

  // Try V2 first
  try {
    const path = `/v2/applications/3594179146/box?name=b64:${encodeURIComponent(b64Name)}`;
    const data = await algodFetch(path);
    const value = Uint8Array.from(Buffer.from(data.value, 'base64'));
    return { source: 'V2', tallies: decodeV2VoteBox(value) };
  } catch (e: any) {
    if (e.message?.includes('404')) {
      // V2 not found, try V1 legacy
      try {
        const path = `/v2/applications/3500693631/box?name=b64:${encodeURIComponent(b64Name)}`;
        const data = await algodFetch(path);
        const value = Uint8Array.from(Buffer.from(data.value, 'base64'));
        return { source: 'V1 legacy', tallies: decodeV1VoteBox(value) };
      } catch (e2: any) {
        if (e2.message?.includes('404')) return null;
        console.warn('[algod-server] V1 fetch error:', e2);
        return null;
      }
    }
    console.warn('[algod-server] V2 fetch error:', e);
    return null;
  }
}

function decodeV2StakeRecord(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset);
  return {
    optionIndex: data[0],
    tokenAmount: view.getBigUint64(1, false).toString(),
    stakeTimestamp: Number(view.getBigUint64(9, false)),
    lockDuration: Number(view.getBigUint64(17, false)),
    voterPk: Buffer.from(data.slice(25, 57)).toString('hex'),
  };
}

export async function fetchStakeBoxOnChain(
  voteIdHex: string,
  voterAddress: string
): Promise<{ source: string; stake: any } | null> {
  const crypto = await import('crypto');
  const voteIdBytes = Buffer.from(voteIdHex, 'hex');
  
  // Manual base32 decode for Algorand address
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of voterAddress) {
    const val = alphabet.indexOf(c.toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const voterPk = Buffer.from(bytes.slice(0, 32));
  
  // Stake box key: 0x73 + SHA256(voteId + voterPk)
  const hash = crypto.createHash('sha256').update(Buffer.concat([voteIdBytes, voterPk])).digest();
  const boxName = Buffer.concat([Buffer.from([0x73]), hash]);
  const b64Name = boxName.toString('base64');

  try {
    const APP_ID = 3594179146;
    const path = `/v2/applications/${APP_ID}/box?name=b64:${encodeURIComponent(b64Name)}`;
    const data = await algodFetch(path);
    const value = Uint8Array.from(Buffer.from(data.value, 'base64'));
    if (value.length !== 82) return null;
    return { source: 'V2', stake: decodeV2StakeRecord(value) };
  } catch (e: any) {
    if (e.message?.includes('404')) return null;
    console.warn('[algod-server] stake fetch error:', e);
    return null;
  }
}

/**
 * Convert a 32-byte public key to an Algorand address (base32 + checksum).
 */
function pkToAlgorandAddress(pk: Buffer): string {
  const { createHash } = require('crypto') as typeof import('crypto');
  const checksum = createHash('sha512-256').update(pk).digest().slice(28, 32);
  const addrBytes = Buffer.concat([pk, checksum]);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  for (let idx = 0; idx < addrBytes.length; idx++) {
    const b = addrBytes[idx]; value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(value << (5 - bits)) & 0x1f];
  return result;
}

/**
 * Enumerate all on-chain stake boxes for a given V2 vote.
 * Returns decoded stake records with voter Algorand addresses.
 */
export async function fetchAllStakeBoxesForVote(
  voteIdHex: string
): Promise<Array<{
  address: string;
  optionIndex: number;
  tokenAmount: string;
  stakeTimestamp: number;
  lockDuration: number;
  voterPk: string;
}>> {
  const APP_ID = 3594179146;
  const voteIdPrefix = voteIdHex.substring(0, 50);

  // List all boxes (paginate via next-token, bounded)
  const stakeBoxNames: string[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const path = nextToken
      ? `/v2/applications/${APP_ID}/boxes?next=${encodeURIComponent(nextToken)}`
      : `/v2/applications/${APP_ID}/boxes`;
    const resp = await algodFetch(path);
    const boxes = resp.boxes || [];
    for (const box of boxes) {
      const rawName = Buffer.from(box.name, 'base64');
      if (rawName[0] === 0x73) stakeBoxNames.push(box.name);
    }
    nextToken = resp['next-token'];
    if (!nextToken || boxes.length === 0) break;
  }

  // Fetch, decode, filter by voteId
  const results: Array<any> = [];
  for (const b64Name of stakeBoxNames) {
    try {
      const path = `/v2/applications/${APP_ID}/box?name=b64:${encodeURIComponent(b64Name)}`;
      const data = await algodFetch(path);
      const value = Buffer.from(data.value, 'base64');
      if (value.length !== 82) continue;

      const boxVotePrefix = value.slice(57, 82).toString('hex');
      if (boxVotePrefix !== voteIdPrefix) continue;

      const decoded = decodeV2StakeRecord(new Uint8Array(value));
      results.push({
        address: pkToAlgorandAddress(value.slice(25, 57)),
        optionIndex: decoded.optionIndex,
        tokenAmount: decoded.tokenAmount,
        stakeTimestamp: decoded.stakeTimestamp,
        lockDuration: decoded.lockDuration,
        voterPk: decoded.voterPk,
      });
    } catch (e) {
      console.warn('[algod-server] stake box decode error:', e);
    }
  }
  return results;
}
