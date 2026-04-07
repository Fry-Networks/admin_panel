/**
 * GitHub Allowlist Schema
 * Controls which GitHub users can authenticate to the admin panel
 */
import mongoose from 'mongoose';

export interface GitHubAllowlistEntry extends mongoose.Document {
  githubUsername: string;
  addedBy: string;
  addedAt: Date;
  notes: string;
  enabled: boolean;
}

export const githubAllowlistSchema = new mongoose.Schema<GitHubAllowlistEntry>({
  githubUsername: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  addedBy: {
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    default: '',
  },
  enabled: {
    type: Boolean,
    default: true,
  },
});

// Index for fast lookups during authentication
githubAllowlistSchema.index({ githubUsername: 1, enabled: 1 });

const GitHubAllowlistModel =
  (mongoose.models['github-allowlist'] as mongoose.Model<GitHubAllowlistEntry>) ||
  mongoose.model<GitHubAllowlistEntry>('github-allowlist', githubAllowlistSchema);

export default GitHubAllowlistModel;
