/**
 * Role Definitions Schema
 * Defines custom roles with associated permissions
 */
import mongoose from 'mongoose';

export interface RoleDefinition extends mongoose.Document {
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  createdBy: string;
}

export const roleDefinitionSchema = new mongoose.Schema<RoleDefinition>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: true,
  },
  permissions: {
    type: [String],
    required: true,
    default: [],
  },
  isSystem: {
    type: Boolean,
    required: true,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    required: true,
  },
});

// Prevent deletion of system roles
roleDefinitionSchema.pre('deleteOne', async function (next) {
  const doc = await this.model.findOne(this.getFilter());
  if (doc?.isSystem) {
    throw new Error('Cannot delete system role');
  }
  next();
});

const RoleDefinitionModel =
  (mongoose.models['role-definitions'] as mongoose.Model<RoleDefinition>) ||
  mongoose.model<RoleDefinition>('role-definitions', roleDefinitionSchema);

export default RoleDefinitionModel;
