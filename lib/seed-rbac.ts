/**
 * RBAC Seed Script
 * Run once to initialize the RBAC system with:
 * - System roles (Super Admin, Viewer, Moderator)
 * - Initial allowlist entry (fryscrypto)
 * - Assign Super Admin role to fryscrypto
 *
 * Usage: Import and call seedRBAC() from an API route or script
 */
import { connect } from './connect';
import { ALL_PERMISSIONS, PERMISSIONS } from './permissions';
import RoleDefinitionModel from './role-schema';
import GitHubAllowlistModel from './allowlist-schema';
import WebUserModel from './webusers-model';
import { logAuditEvent } from './audit-schema';

// Initial Super Admin GitHub username
const SUPER_ADMIN_USERNAME = 'fryscrypto';

// System role definitions
const SYSTEM_ROLES = [
  {
    name: 'super-admin',
    description: 'Full system access - all permissions',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    name: 'viewer',
    description: 'Read-only access to all resources',
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.DEVICES_READ,
      PERMISSIONS.DAO_READ,
      PERMISSIONS.FRYWORLD_READ,
      PERMISSIONS.TOKENS_READ,
      PERMISSIONS.PRICES_READ,
    ],
    isSystem: true,
  },
  {
    name: 'moderator',
    description: 'Read access plus device and DAO management',
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.DEVICES_READ,
      PERMISSIONS.DEVICES_WRITE,
      PERMISSIONS.DEVICES_STAKE,
      PERMISSIONS.DEVICES_REFUND,
      PERMISSIONS.DAO_READ,
      PERMISSIONS.DAO_WRITE,
      PERMISSIONS.DAO_VOTE,
      PERMISSIONS.FRYWORLD_READ,
      PERMISSIONS.TOKENS_READ,
      PERMISSIONS.PRICES_READ,
    ],
    isSystem: true,
  },
];

export interface SeedResult {
  success: boolean;
  rolesCreated: string[];
  rolesSkipped: string[];
  allowlistAdded: boolean;
  userUpdated: boolean;
  errors: string[];
}

export async function seedRBAC(): Promise<SeedResult> {
  await connect();

  const result: SeedResult = {
    success: true,
    rolesCreated: [],
    rolesSkipped: [],
    allowlistAdded: false,
    userUpdated: false,
    errors: [],
  };

  // 1. Create system roles
  for (const roleDef of SYSTEM_ROLES) {
    try {
      const existing = await RoleDefinitionModel.findOne({ name: roleDef.name });
      if (existing) {
        result.rolesSkipped.push(roleDef.name);
        continue;
      }

      await RoleDefinitionModel.create({
        ...roleDef,
        createdAt: new Date(),
        createdBy: 'system-seed',
      });
      result.rolesCreated.push(roleDef.name);

      await logAuditEvent(
        'role:create',
        'role-definitions',
        roleDef.name,
        'system-seed',
        { roleName: roleDef.name, isSystem: true }
      );
    } catch (error: any) {
      result.errors.push(`Failed to create role '${roleDef.name}': ${error.message}`);
      result.success = false;
    }
  }

  // 2. Add Super Admin to allowlist
  try {
    const existingAllowlist = await GitHubAllowlistModel.findOne({
      githubUsername: SUPER_ADMIN_USERNAME.toLowerCase(),
    });

    if (!existingAllowlist) {
      await GitHubAllowlistModel.create({
        githubUsername: SUPER_ADMIN_USERNAME.toLowerCase(),
        addedBy: 'system-seed',
        addedAt: new Date(),
        notes: 'Initial Super Admin - system seed',
        enabled: true,
      });
      result.allowlistAdded = true;

      await logAuditEvent(
        'allowlist:add',
        'github-allowlist',
        SUPER_ADMIN_USERNAME.toLowerCase(),
        'system-seed',
        { githubUsername: SUPER_ADMIN_USERNAME }
      );
    }
  } catch (error: any) {
    result.errors.push(`Failed to add allowlist entry: ${error.message}`);
    result.success = false;
  }

  // 3. Assign Super Admin role to user (if user exists)
  try {
    // Find user by name or email matching the GitHub username pattern
    const user = await WebUserModel.findOne({
      $or: [
        { name: { $regex: new RegExp(SUPER_ADMIN_USERNAME, 'i') } },
        { username: { $regex: new RegExp(SUPER_ADMIN_USERNAME, 'i') } },
        { email: { $regex: new RegExp(SUPER_ADMIN_USERNAME, 'i') } },
      ],
    });

    if (user) {
      const currentRoles = user.roles || [];
      if (!currentRoles.includes('super-admin')) {
        user.roles = [...currentRoles, 'super-admin'];
        user.admin = true; // Ensure legacy admin flag is set
        await user.save();
        result.userUpdated = true;

        await logAuditEvent(
          'role:assign',
          'webusers',
          user._id.toString(),
          'system-seed',
          { roleName: 'super-admin', githubUsername: SUPER_ADMIN_USERNAME }
        );
      }
    } else {
      // User doesn't exist yet - they'll get the role on first login
      // We can't assign roles to a user that doesn't exist
      result.errors.push(
        `User '${SUPER_ADMIN_USERNAME}' not found in webusers - role will be assigned on first login`
      );
    }
  } catch (error: any) {
    result.errors.push(`Failed to assign Super Admin role: ${error.message}`);
    result.success = false;
  }

  return result;
}

/**
 * Check if RBAC has been seeded
 */
export async function isRBACSeeded(): Promise<boolean> {
  await connect();
  const superAdminRole = await RoleDefinitionModel.findOne({ name: 'super-admin' });
  return !!superAdminRole;
}
