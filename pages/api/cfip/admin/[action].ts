import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, MySession } from '../../auth/[...nextauth]';
import clientPromise from '../../../../lib/mongoclient';
import mongoose from 'mongoose';
import { CFIP_CONFIG } from '../../../../lib/cfip-schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') { res.status(405).json({ message: 'Method Not Allowed' }); return; }
  const session = (await getServerSession(req, res, authOptions)) as MySession;
  if (!session || !session.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
  if (!session.user.owner && process.env.NODE_ENV !== 'development') { res.status(403).json({ message: 'Only Fry Networks owners can manage CFIPs' }); return; }

  const { action } = req.query;
  const { cfipId, notes, votingPeriodDays } = req.body;
  if (!cfipId) { res.status(400).json({ message: 'CFIP ID is required' }); return; }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const cfipCollection = db.collection('cfips');
    const daoCollection = db.collection(process.env.NEXT_PUBLIC_DAO_TEST === 'true' ? 'test-dao' : 'dao');
    const cfip = await cfipCollection.findOne({ _id: new mongoose.Types.ObjectId(cfipId) });
    if (!cfip) { res.status(404).json({ message: 'CFIP not found' }); return; }

    switch (action) {
      case 'approve-voting': {
        if (cfip.status !== 'pending_review') { res.status(400).json({ message: 'Can only approve pending CFIPs for voting' }); return; }
        const days = votingPeriodDays || CFIP_CONFIG.DEFAULT_VOTING_PERIOD_DAYS;
        const votingEnd = new Date(); votingEnd.setDate(votingEnd.getDate() + days);
        await cfipCollection.updateOne({ _id: new mongoose.Types.ObjectId(cfipId) }, { $set: { status: 'community_voting', voting_start: new Date(), voting_end: votingEnd, admin_notes: notes || null, approved_by: session.user.email, approved_at: new Date(), updated_at: new Date() } });
        console.log(`CFIP ${cfipId} approved for community voting by ${session.user.email}`);
        res.status(200).json({ message: 'CFIP opened for community voting', voting_end: votingEnd }); break;
      }
      case 'veto': {
        if (['vetoed', 'promoted'].includes(cfip.status)) { res.status(400).json({ message: 'Cannot veto a CFIP that is already vetoed or promoted' }); return; }
        await cfipCollection.updateOne({ _id: new mongoose.Types.ObjectId(cfipId) }, { $set: { status: 'vetoed', vetoed_by: session.user.email, vetoed_at: new Date(), admin_notes: notes || cfip.admin_notes, updated_at: new Date() } });
        console.log(`CFIP ${cfipId} vetoed by ${session.user.email}`);
        res.status(200).json({ message: 'CFIP has been vetoed' }); break;
      }
      case 'promote-to-fip': {
        if (cfip.status !== 'approved_for_fip') { res.status(400).json({ message: 'Can only promote CFIPs that have been approved by community vote' }); return; }
        const newFIP = {
          title: `[CFIP] ${cfip.title}`, total_votes: 0, createdAt: new Date(), current: false, description: cfip.description,
          votes: [ { option: '0', title: 'Approve', description: 'Approve this proposal', votes: 0, different_people: [] }, { option: '1', title: 'Reject', description: 'Reject this proposal', votes: 0, different_people: [] } ],
          cfip_origin: { cfip_id: cfip._id, author: cfip.author, community_votes: cfip.community_votes }
        };
        const fipResult = await daoCollection.insertOne(newFIP);
        await cfipCollection.updateOne({ _id: new mongoose.Types.ObjectId(cfipId) }, { $set: { status: 'promoted', promoted_fip_id: fipResult.insertedId, admin_notes: notes || cfip.admin_notes, updated_at: new Date() } });
        console.log(`CFIP ${cfipId} promoted to FIP ${fipResult.insertedId} by ${session.user.email}`);
        res.status(200).json({ message: 'CFIP promoted to official FIP', fipId: fipResult.insertedId.toString() }); break;
      }
      case 'add-notes': {
        await cfipCollection.updateOne({ _id: new mongoose.Types.ObjectId(cfipId) }, { $set: { admin_notes: notes, updated_at: new Date() } });
        res.status(200).json({ message: 'Notes updated' }); break;
      }
      case 'reject': {
        if (!['pending_review', 'community_voting'].includes(cfip.status)) { res.status(400).json({ message: 'Can only reject pending or voting CFIPs' }); return; }
        await cfipCollection.updateOne({ _id: new mongoose.Types.ObjectId(cfipId) }, { $set: { status: 'rejected', admin_notes: notes || cfip.admin_notes, updated_at: new Date() } });
        console.log(`CFIP ${cfipId} rejected by ${session.user.email}`);
        res.status(200).json({ message: 'CFIP has been rejected' }); break;
      }
      default: res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error(`Error processing CFIP admin action ${action}:`, error);
    res.status(500).json({ message: 'Error processing action' });
  }
}
