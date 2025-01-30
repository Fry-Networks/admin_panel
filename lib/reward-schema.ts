import { BlockTxidsResponse } from 'algosdk/dist/types/client/v2/algod/models/types';
import mongoose, { mongo } from 'mongoose';
import { object } from 'prop-types';
export const rewardSchema = new mongoose.Schema({
  no: Number,
  miner_key: String,
  status: String,
  asset_id: String,
  amount: Number,
  createdAt: Date
});
export interface Reward extends mongoose.Document {
  no: number;
  miner_key: string;
  status: string;
  asset_id: string;
  amount: number;
  createdAt: Date;
}

const RewardModel = (mongoose.models.fee ||
  mongoose.model<Reward>('rewards', rewardSchema)) as mongoose.Model<Reward>;

export default RewardModel;
