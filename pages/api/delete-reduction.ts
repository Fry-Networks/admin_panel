import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongoclient';
import { Reduction } from '../../lib/reductions-schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (req.method !== 'DELETE') {
    res
      .status(405)
      .json({ success: false, message: 'Only DELETE method is allowed' });
    return;
  }

  const { index } = req.body;
  console.log(`Delete ${index} reduction request accepted`);
  if (typeof index !== 'number' || index < 0) {
    res.status(400).json({ success: false, message: 'Invalid index value' });
    return;
  }

  const client = await clientPromise;

  try {
    const db = client.db('main');
    const collection = db.collection('reductions');

    const targetDocument = await collection
      .find()
      .sort({ _id: 1 })
      .skip(index)
      .limit(1)
      .toArray();

    if (targetDocument.length === 0) {
      res.status(404).json({
        success: false,
        message: `No document found at index: ${index}`
      });
      console.log(`Error status 404 No document found at index: ${index}`);
      return;
    }

    const minDeviceCount = targetDocument[0].minDeviceCount;
    const deleteResult = await collection.deleteOne({
      _id: targetDocument[0]._id
    });
    if (deleteResult.deletedCount === 0) {
      res
        .status(500)
        .json({ success: false, message: 'Failed to delete the document.' });
      return;
    }

    console.log(`Deleted document at index: ${index}`);

    const documentCount = await collection.countDocuments({});
    if (documentCount > 0) {
      const nextDocument = await collection
        .find()
        .sort({ _id: 1 })
        .skip(index)
        .limit(1)
        .toArray();
      if (nextDocument.length > 0) {
        const updateMinDeviceCount = minDeviceCount;
        console.log(updateMinDeviceCount);
        console.log(nextDocument);
        const updateResult = await collection.updateOne(
          { _id: nextDocument[0]._id },
          { $set: { minDeviceCount: updateMinDeviceCount } }
        );

        if (updateResult.modifiedCount < 0) {
          res.status(500).json({
            success: true,
            message: `Reduction deleted, but failed to update the next reduction.`
          });
        }
      }
    }
    res.status(200).json({
      success: true,
      message: `Reduction at index ${index} is deleted`
    });
  } catch (err: unknown) {
    console.error('Error deleting or updating data:', err);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: (err as Error).message || 'Unknown error'
    });
  }
}
