import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from 'mongoose';
import { Vote } from '../../lib/vote-schema';
import { fetchVoteBoxOnChain, fetchStakeBoxOnChain, fetchAllStakeBoxesForVote } from '../../lib/algod-server';

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
      const stakesInformation: any[] = [];

      if ((vote as any).contractVoteId) {
        // V2 path: enumerate on-chain stake boxes directly
        try {
          const onChainStakes = await fetchAllStakeBoxesForVote(
            (vote as any).contractVoteId
          );
          for (const stake of onChainStakes) {
            stakesInformation.push({
              address: stake.address,
              voteTitle: voteTitle,
              voteOption: stake.optionIndex.toString(),
              amount: stake.tokenAmount,
              onChain: { source: 'V2', stake }
            });
          }
        } catch (e) {
          console.warn('[get-vote-status] V2 on-chain enumeration failed:', e);
        }
      } else {
        // V1 path: read from MongoDB (tolerate missing records)
        for (let i = 0; i < votes.length; i++) {
          const different_people = votes[i].different_people;
          for (const one of different_people) {
            const stakeForOne = await stakeCollection.findOne({
              voteTitle: voteTitle,
              voteOption: i.toString(),
              address: one
            });
            if (stakeForOne) {
              stakesInformation.push(stakeForOne);
            }
            // Softened: skip missing records instead of hard-fail 404
          }
        }
      }

      res.status(200).json({ data: stakesInformation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding vote' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
