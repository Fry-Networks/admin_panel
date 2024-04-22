import mongoose from "mongoose";

export interface Vote extends mongoose.Document {
    expires_on: Date;
    total_votes: number;
    title: string;
    description: string;
    votes: [
        {
            id: string;
            option: string;
            description: string;
            title: string;
            votes: number;
            different_people: number;
        }
    ]
    }

export const voteSchema = new mongoose.Schema({
    expires_on: Date,
    total_votes: Number,
    title: String,
    description: String,
    votes: [
        {
            id: String,
            option: String,
            description: String,
            title: String,
            votes: Number,
            different_people: Number
        }
    ]
});
