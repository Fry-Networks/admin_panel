import mongoose from 'mongoose';

export interface Vote extends mongoose.Document {
  end_date: Date;
  total_votes: number;
  createdAt: Date;
  deleted: boolean;
  current: boolean;
  title: string;
  super_majority: boolean;
  description: string;
  votes: [
    {
      id: string;
      option: string;
      description: string;
      title: string;
      votes: number;
      different_people: string[];
    }
  ];
}

export const voteSchema = new mongoose.Schema({
  end_date: Date,
  total_votes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false },
  super_majority: { type: Boolean, default: false },
  current: { type: Boolean, default: false },
  title: String,
  description: String,
  votes: [
    {
      option: String,
      description: String,
      title: String,
      votes: { type: Number, default: 0 },
      different_people: { type: [String], default: [] }
    }
  ]
});
