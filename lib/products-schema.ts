import mongoose, { mongo } from 'mongoose';
export const productsSchema = new mongoose.Schema({
  wix_id: String,
  name: String,
  key: String,
  reward: {
    unverified: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    register: { type: Number, default: 0 },
    stake: {
      stake_one: { type: Number, default: 0 },
      stake_two: { type: Number, default: 0 }
    },
    tokens: {
      staked: { type: String },
      reward: { type: String },
      register: { type: String }
    }
  },
  created_at: { type: Date, default: Date.now }
});
export interface Product extends mongoose.Document {
  wix_id: string;
  name: string;
  key: string;
  reward: {
    unverified: number;
    verified: number;
    register: number;
    stake?: {
      stake_one: number;
      stake_two: number;
    };
    tokens?: {
      stake: string;
      reward: string;
      register: string;
    };
  };
  created_at: Date;
}

export const ProductModel = mongoose.model<Product>('products', productsSchema);
