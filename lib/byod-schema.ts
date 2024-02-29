import mongoose from "mongoose";

export interface ByodUser extends mongoose.Document {
    licenses: string[];
    payments: string[];
    address: string;
    email: string;
    algo: boolean;
    fry: boolean;
    }