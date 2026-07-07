import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from 'mongoose';
import algosdk from 'algosdk';
import { Vote } from '../../lib/vote-schema';
import http from 'http';

const ALGOD_PRIMARY = 'http://192.168.9.2:8190';
const ALGOD_FALLBACK = 'https://mainnet-api.4160.nodely.dev';
const INDEXER_BASE = 'https://mainnet-idx.4160.nodely.dev';
const GOVERNANCE_APP_ID = 3594179146;
const CAST_VOTE_SELECTOR = 'b239e8c4';
const MIGRATE_VOTE_SELECTOR = 'a55156d2';

/**
 * Make HTTP request to ATLAS00 algod (same pattern as confirm-contract-vote).
 */
function algodRequest(path: string): Promise<{ status: number; data: any } | null> {
  return new Promise((resolve) => {
    const url = new URL(ALGOD_PRIMARY + path);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 5000,
      headers: { 'X-Algo-API-Token': process.env.ALGOD_TOKEN || '' }
    };
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ status: res.statusCode || 500, data });
        } catch {
          resolve({ status: res.statusCode || 500, data: {} });
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function algodFallbackRequest(path: string): Promise<{ status: number; data: any } | null> {
  try {
    const response = await fetch(ALGOD_FALLBACK + path, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return { status: response.status, data };
    }
    return { status: response.status, data: {} };
  } catch {
    return null;
  }
}

/**
 * Read the V2 vote box and enumerate voters per option from the indexer.
 * Box layout: id(32) created(8) end(8) lock(8) options(8) super(8)
 *             totalTokens[4]@72 totalVoters[4]@104.
 * Roster comes from cast_vote senders plus admin_migrate_vote voter args.
 */
async function fetchOnChainState(contractVoteId: string): Promise<{
  tokens: string[]; voters: string[]; perOption: Record<string, string[]>;
}> {
  const boxName = Buffer.concat([Buffer.from([0x76]), Buffer.from(contractVoteId, 'hex')]);
  const boxPath = `/v2/applications/${GOVERNANCE_APP_ID}/box?name=b64:${encodeURIComponent(boxName.toString('base64'))}`;
  let result = await algodRequest(boxPath);
  if (!result || result.status !== 200) {
    result = await algodFallbackRequest(boxPath);
  }
  if (!result || result.status !== 200 || !result.data?.value) {
    throw new Error(`vote box read failed (HTTP ${result ? result.status : 'unreachable'})`);
  }
  const box = Buffer.from(result.data.value, 'base64');
  const tokens: string[] = [];
  const voters: string[] = [];
  for (let i = 0; i < 4; i++) {
    tokens.push(box.readBigUInt64BE(72 + i * 8).toString());
    voters.push(box.readBigUInt64BE(104 + i * 8).toString());
  }

  const perOption: Record<string, string[]> = {};
  const add = (opt: string, addr: string) => {
    const list = perOption[opt] ?? (perOption[opt] = []);
    if (!list.includes(addr)) list.push(addr);
  };
  let next = '';
  for (let page = 0; page < 5; page++) {
    const url = `${INDEXER_BASE}/v2/transactions?application-id=${GOVERNANCE_APP_ID}&limit=1000` +
      (next ? `&next=${encodeURIComponent(next)}` : '');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`indexer HTTP ${res.status}`);
    const data = await res.json();
    const txns: any[] = data.transactions ?? [];
    for (const t of txns) {
      const args: string[] = t['application-transaction']?.['application-args'] ?? [];
      if (args.length < 3) continue;
      const selector = Buffer.from(args[0], 'base64').toString('hex');
      if (Buffer.from(args[1], 'base64').toString('hex') !== contractVoteId) continue;
      if (selector === CAST_VOTE_SELECTOR) {
        add(String(Buffer.from(args[2], 'base64')[0] ?? 0), t.sender);
      } else if (selector === MIGRATE_VOTE_SELECTOR && args.length >= 4) {
        const voterKey = Buffer.from(args[2], 'base64');
        if (voterKey.length === 32) {
          add(String(Buffer.from(args[3], 'base64')[0] ?? 0), algosdk.encodeAddress(new Uint8Array(voterKey)));
        }
      }
    }
    next = data['next-token'];
    if (!next || txns.length === 0) break;
  }
  return { tokens, voters, perOption };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const testMode = process.env.NEXT_PUBLIC_DAO_TEST === 'true' ? true : false;

  // Check if user is authenticated and is an admin
  if (
    (!session || !session.user.admin || !session.user.owner) &&
    process.env.NODE_ENV !== 'development'
  ) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection(testMode ? 'test-dao' : 'dao');
  const stakeCollection = db.collection(
    testMode ? 'test-dao-stakes' : 'dao-stakes'
  );

  if (req.method === 'PUT') {
    const data: { id: string } = req.body;
    const { id } = data;

    try {
      const vote = (await collection.findOne({
        _id: new mongoose.Types.ObjectId(id)
      })) as Vote;

      if (!vote) {
        res.status(404).json({ message: 'Vote not found' });
        return;
      }

      const voteTitle = vote.title;
      const votes = vote.votes;

      // Option metadata drives dynamic table rendering (2-8 options)
      const options = votes.map((v: any, i: number) => ({
        option: v.option ?? String(i),
        title: v.title ?? `Option ${i + 1}`,
        votes: v.votes ?? 0,
        people: (v.different_people ?? []).length
      }));

      // A missing dao-stakes record no longer aborts the whole response —
      // contract votes have no stake documents at all.
      const stakesInformation: any[] = [];
      for (let i = 0; i < votes.length; i++) {
        const different_people = votes[i].different_people ?? [];
        for (const one of different_people) {
          const stakeForOne = await stakeCollection.findOne({
            voteTitle: voteTitle,
            voteOption: i.toString(),
            address: one
          });

          if (stakeForOne) {
            stakesInformation.push(stakeForOne);
          } else {
            stakesInformation.push({
              address: one,
              voteOption: i.toString(),
              votes: null,
              stakes: null,
              missing: true
            });
          }
        }
      }

      // On-chain cross-check for V2 contract votes
      let onChain: any;
      const contractVoteId: string | undefined = (vote as any).contractVoteId;
      if (contractVoteId && contractVoteId.length === 64) {
        try {
          const state = await fetchOnChainState(contractVoteId);
          const divergence = options.some((opt: any, i: number) => {
            const mongoSet = new Set(votes[i].different_people ?? []);
            const chainList = state.perOption[opt.option] ?? [];
            if (mongoSet.size !== chainList.length) return true;
            return chainList.some((a) => !mongoSet.has(a));
          });
          onChain = { available: true, appId: GOVERNANCE_APP_ID, ...state, divergence };
        } catch (e: any) {
          onChain = { available: false, reason: e?.message ?? 'unknown error' };
        }
      } else {
        onChain = { available: false, reason: 'legacy vote (no contractVoteId)' };
      }

      res.status(200).json({ data: stakesInformation, options, onChain });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching vote status' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
