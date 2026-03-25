import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.admin) {
    res.status(401).json({ message: 'Unauthorized user access' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('frystaking');
    const collection = db.collection('gasFee');

    const { startDate, endDate, filterString, page = 1, limit = 20 } = req.body;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const query: Record<string, any> = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const parsedEndDate = new Date(endDate as string);
        parsedEndDate.setDate(parsedEndDate.getDate() + 1);
        query.createdAt.$lte = parsedEndDate;
      }
    }

    if (filterString) {
      query.$or = [
        { userId: { $regex: filterString, $options: 'i' } },
        { txId: { $regex: filterString, $options: 'i' } }
      ];
    }

    const totalCount = await collection.countDocuments(query);

    const totalSumResult = await collection
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSum: { $sum: '$usdValue' }
          }
        }
      ])
      .toArray();

    const totalPaymentSum =
      totalSumResult.length > 0 ? totalSumResult[0].totalSum : 0;

    const gasFees = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();

    res.status(200).json({
      success: true,
      totalCount,
      totalPaymentSum,
      gasFees: JSON.parse(JSON.stringify(gasFees))
    });
  } catch (error) {
    console.error(`GasFee History Error: ${error}`);
    res.status(500).json({ message: 'Internal Error' });
  }
}
