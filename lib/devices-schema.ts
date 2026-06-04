import mongoose, { mongo } from 'mongoose';
export const devicesSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  miner_key: String,
  name: String,
  is_registered: { type: Boolean, default: false },
  email: String,
  order: String,
  registered_at: Date,
  created_at: { type: Date, default: Date.now },
  // Virtual mining fields (Phase 4)
  virtual: { type: Boolean, default: false },
  activated: { type: Boolean, default: false },
  activated_at: { type: Date, default: null },
  reward_wallet: { type: String, default: null },
  wix_order_id: { type: String, default: null },
  wix_line_item_id: { type: String, default: null },
  transitioned_at: { type: Date, default: null },
  transitioned_to_device: { type: String, default: null },
  canceled_at: { type: Date, default: null },
});
export interface Device extends mongoose.Document {
  user_id: mongoose.Schema.Types.ObjectId | string;
  miner_key: string;
  name: string;
  address: string;
  is_registered: boolean;
  registered_at: Date;
  created_at: string;
  order: string;
  byod?: string;
  email: string;
  verified: boolean;
  registration?: {
    asset_id: string;
    amount: number;
  };
  node?: {
    asset_id: string;
    amount: number;
  };
  // Virtual mining fields
  virtual?: boolean;
  activated?: boolean;
  activated_at?: Date | null;
  reward_wallet?: string | null;
  wix_order_id?: string | null;
  wix_line_item_id?: string | null;
  transitioned_at?: Date | null;
  transitioned_to_device?: string | null;
  canceled_at?: Date | null;
}

const DeviceModel = (mongoose.models.device ||
  mongoose.model<Device>('device', devicesSchema)) as mongoose.Model<Device>;

export default DeviceModel;
