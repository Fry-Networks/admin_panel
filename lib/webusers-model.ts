import mongoose from 'mongoose';

export const webUsersSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  admin: Boolean,
  // RBAC fields
  roles: {
    type: [String],
    default: [],
  },
  permissions: {
    type: [String],
    default: [],
  },
});

export interface webUser extends mongoose.Document {
  name: string;
  username: string;
  email: string;
  admin: boolean;
  // RBAC fields
  roles: string[];
  permissions: string[];
}

export interface rawWebUser {
  name: string;
  username: string;
  email: string;
  admin: boolean;
  // RBAC fields
  roles: string[];
  permissions: string[];
}

const WebUserModel =
  (mongoose.models.webusers ||
    mongoose.model<webUser>('webusers', webUsersSchema)) as mongoose.Model<webUser>;

export default WebUserModel;
