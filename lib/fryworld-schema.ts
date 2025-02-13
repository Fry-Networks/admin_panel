import { BlockTxidsResponse } from 'algosdk/dist/types/client/v2/algod/models/types';
import mongoose, { mongo } from 'mongoose';
import { object } from 'prop-types';
export const fryworldSchema = new mongoose.Schema({
  address: String,
  asset_id: String,
  price: Number,
  txId: String,
  createdAt: Date
});
export interface FryWrold extends mongoose.Document {
  address: string;
  asset_id: string;
  price: number;
  txId: string;
  createdAt: Date;
}

const FryWorldModel = (mongoose.models.fee ||
  mongoose.model<FryWrold>(
    'created-tokens',
    fryworldSchema
  )) as mongoose.Model<FryWrold>;

export default FryWorldModel;
