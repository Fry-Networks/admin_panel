/**
 * FryWorld Configuration Schema (Singleton)
 * Single document that holds all fry.farm fee configuration
 * Edit in place - audit log handles version history
 */
import mongoose from 'mongoose';
import { connect } from './connect';

// Revenue split percentages (must sum to 100)
export interface RevenueSplit {
  stakers: number;      // Default: 60
  treasury: number;     // Default: 25
  poolCreator: number;  // Default: 10
  compound: number;     // Default: 5
}

export interface FryWorldConfig extends mongoose.Document {
  // Staking fees (percentages)
  stakingDepositFeePercent: number;   // Default: 0.5
  stakingWithdrawFeePercent: number;  // Default: 0.25
  stakingClaimFeePercent: number;     // Default: 8.0

  // Farming fees (percentages)
  farmingDepositFeePercent: number;   // Default: 0.5
  farmingWithdrawFeePercent: number;  // Default: 0.25
  farmingClaimFeePercent: number;     // Default: 8.0

  // Other fees
  swapFeePercent: number;             // Default: 0.1
  dailyClaimFeePercent: number;       // Default: 5.0
  poolCreationFeeUsd: number;         // Default: 1.00

  // Fee recipient wallet
  feeRecipient: string;               // Default: E2F2LT2INE75DBOYHQXTCTOP2PAP5MHAXQRXTTCCXFKHQTVG36DJONBQZE

  // Revenue distribution
  revenueSplit: RevenueSplit;

  // Metadata
  updatedAt: Date;
  updatedBy: string;
}

// Default values
const DEFAULT_FEE_RECIPIENT = 'E2F2LT2INE75DBOYHQXTCTOP2PAP5MHAXQRXTTCCXFKHQTVG36DJONBQZE';

const DEFAULT_REVENUE_SPLIT: RevenueSplit = {
  stakers: 60,
  treasury: 25,
  poolCreator: 10,
  compound: 5,
};

export const fryworldConfigSchema = new mongoose.Schema<FryWorldConfig>({
  stakingDepositFeePercent: {
    type: Number,
    required: true,
    default: 0.5,
  },
  stakingWithdrawFeePercent: {
    type: Number,
    required: true,
    default: 0.25,
  },
  stakingClaimFeePercent: {
    type: Number,
    required: true,
    default: 8.0,
  },
  farmingDepositFeePercent: {
    type: Number,
    required: true,
    default: 0.5,
  },
  farmingWithdrawFeePercent: {
    type: Number,
    required: true,
    default: 0.25,
  },
  farmingClaimFeePercent: {
    type: Number,
    required: true,
    default: 8.0,
  },
  swapFeePercent: {
    type: Number,
    required: true,
    default: 0.1,
  },
  dailyClaimFeePercent: {
    type: Number,
    required: true,
    default: 5.0,
  },
  poolCreationFeeUsd: {
    type: Number,
    required: true,
    default: 1.0,
  },
  feeRecipient: {
    type: String,
    required: true,
    default: DEFAULT_FEE_RECIPIENT,
  },
  revenueSplit: {
    stakers: { type: Number, required: true, default: 60 },
    treasury: { type: Number, required: true, default: 25 },
    poolCreator: { type: Number, required: true, default: 10 },
    compound: { type: Number, required: true, default: 5 },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String,
    default: 'system',
  },
});

// Validate revenue split sums to 100
fryworldConfigSchema.pre('save', function (next) {
  const split = this.revenueSplit;
  const total = split.stakers + split.treasury + split.poolCreator + split.compound;
  if (Math.abs(total - 100) > 0.01) {
    next(new Error(`Revenue split must sum to 100, got ${total}`));
  } else {
    next();
  }
});

const FryWorldConfigModel =
  (mongoose.models['fryworld-config'] as mongoose.Model<FryWorldConfig>) ||
  mongoose.model<FryWorldConfig>('fryworld-config', fryworldConfigSchema);

export default FryWorldConfigModel;

/**
 * Get the singleton fee config document
 * Creates with defaults if none exists
 */
export async function getFeeConfig(): Promise<FryWorldConfig> {
  await connect();

  let config = await FryWorldConfigModel.findOne();

  if (!config) {
    // Create default config
    config = await FryWorldConfigModel.create({
      stakingDepositFeePercent: 0.5,
      stakingWithdrawFeePercent: 0.25,
      stakingClaimFeePercent: 8.0,
      farmingDepositFeePercent: 0.5,
      farmingWithdrawFeePercent: 0.25,
      farmingClaimFeePercent: 8.0,
      swapFeePercent: 0.1,
      dailyClaimFeePercent: 5.0,
      poolCreationFeeUsd: 1.0,
      feeRecipient: DEFAULT_FEE_RECIPIENT,
      revenueSplit: DEFAULT_REVENUE_SPLIT,
      updatedAt: new Date(),
      updatedBy: 'system',
    });
  }

  return config;
}

/**
 * Raw interface for API responses (without Mongoose document methods)
 */
export interface RawFryWorldConfig {
  _id: string;
  stakingDepositFeePercent: number;
  stakingWithdrawFeePercent: number;
  stakingClaimFeePercent: number;
  farmingDepositFeePercent: number;
  farmingWithdrawFeePercent: number;
  farmingClaimFeePercent: number;
  swapFeePercent: number;
  dailyClaimFeePercent: number;
  poolCreationFeeUsd: number;
  feeRecipient: string;
  revenueSplit: RevenueSplit;
  updatedAt: Date;
  updatedBy: string;
}
