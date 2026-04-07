/**
 * Audit Log Schema
 * Tracks all administrative actions for compliance and debugging
 * No TTL - logs are kept forever
 */
import mongoose from 'mongoose';

export interface AuditLogEntry extends mongoose.Document {
  action: string;
  targetType: string;
  targetId: string;
  performedBy: string;
  details: Record<string, any>;
  timestamp: Date;
}

export const auditLogSchema = new mongoose.Schema<AuditLogEntry>({
  action: {
    type: String,
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    required: true,
    index: true,
  },
  targetId: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
    index: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for common queries
auditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });

// No TTL index - logs are kept forever per requirement

const AuditLogModel =
  (mongoose.models['audit-log'] as mongoose.Model<AuditLogEntry>) ||
  mongoose.model<AuditLogEntry>('audit-log', auditLogSchema);

export default AuditLogModel;

/**
 * Helper to create an audit log entry
 */
export async function logAuditEvent(
  action: string,
  targetType: string,
  targetId: string,
  performedBy: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    await AuditLogModel.create({
      action,
      targetType,
      targetId,
      performedBy,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw - audit logging should not break the main operation
  }
}
