import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, MySession } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongoclient';
import { CFIPStatus } from '../../../lib/cfip-schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.status(405).json({ message: 'Method Not Allowed' }); return; }
  const session = (await getServerSession(req, res, authOptions)) as MySession;

  try {
    const { status, author, page = 1, limit = 20, includeMyVote = false } = req.query;
    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection('cfips');
    const query: any = {};

    if (status) { query.status = Array.isArray(status) ? { $in: status } : status; }
    if (author) { query['author.discordId'] = author; }

    const isAdmin = session?.user?.admin || session?.user?.owner;
    const userDiscordId = session?.user?.providerAccountId;

    if (!isAdmin) {
      if (userDiscordId) {
        query.$or = [ { status: { $in: ['community_voting', 'approved_for_fip', 'rejected', 'vetoed', 'promoted'] } }, { 'author.discordId': userDiscordId } ];
      } else {
        query.status = { $in: ['community_voting', 'approved_for_fip', 'promoted'] };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [cfips, totalCount] = await Promise.all([
      collection.find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
      collection.countDocuments(query)
    ]);

    let cfipsWithVotes = cfips;
    if (includeMyVote && userDiscordId) {
      cfipsWithVotes = cfips.map((cfip: any) => {
        const userVote = cfip.community_votes?.voters?.find((v: any) => v.discordId === userDiscordId);
        return { ...cfip, myVote: userVote?.vote || null };
      });
    }

    const sanitizedCFIPs = cfipsWithVotes.map((cfip: any) => {
      if (!isAdmin) {
        return { ...cfip, community_votes: { promote: cfip.community_votes.promote, reject: cfip.community_votes.reject, voterCount: cfip.community_votes.voters?.length || 0 }, myVote: cfip.myVote, admin_notes: undefined };
      }
      return cfip;
    });

    res.status(200).json({ cfips: sanitizedCFIPs, pagination: { page: Number(page), limit: Number(limit), totalCount, totalPages: Math.ceil(totalCount / Number(limit)) } });
  } catch (error) {
    console.error('Error listing CFIPs:', error);
    res.status(500).json({ message: 'Error fetching CFIPs' });
  }
}
