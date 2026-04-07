/**
 * RBAC Permission System
 * Defines atomic permissions and helper to check user access
 */

// ============================================================================
// Permission Constants (organized by category)
// ============================================================================

export const PERMISSIONS = {
  // User Management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  // Device Management
  DEVICES_READ: 'devices:read',
  DEVICES_WRITE: 'devices:write',
  DEVICES_DELETE: 'devices:delete',
  DEVICES_STAKE: 'devices:stake',
  DEVICES_REFUND: 'devices:refund',

  // Governance / DAO
  DAO_READ: 'dao:read',
  DAO_WRITE: 'dao:write',
  DAO_VOTE: 'dao:vote',
  DAO_ADMIN: 'dao:admin',

  // fry.farm / FryWorld
  FRYWORLD_READ: 'fryworld:read',
  FRYWORLD_CONFIG: 'fryworld:config',
  FRYWORLD_EVENTS: 'fryworld:events',
  FRYWORLD_POOLS: 'fryworld:pools',

  // Tokens & Pricing
  TOKENS_READ: 'tokens:read',
  TOKENS_WRITE: 'tokens:write',
  PRICES_READ: 'prices:read',
  PRICES_WRITE: 'prices:write',

  // System Administration
  ADMIN_ROLES: 'admin:roles',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_SETTINGS: 'admin:settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// All permissions as array (for Super Admin role)
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  users: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_DELETE],
  devices: [PERMISSIONS.DEVICES_READ, PERMISSIONS.DEVICES_WRITE, PERMISSIONS.DEVICES_DELETE, PERMISSIONS.DEVICES_STAKE, PERMISSIONS.DEVICES_REFUND],
  dao: [PERMISSIONS.DAO_READ, PERMISSIONS.DAO_WRITE, PERMISSIONS.DAO_VOTE, PERMISSIONS.DAO_ADMIN],
  fryworld: [PERMISSIONS.FRYWORLD_READ, PERMISSIONS.FRYWORLD_CONFIG, PERMISSIONS.FRYWORLD_EVENTS, PERMISSIONS.FRYWORLD_POOLS],
  tokens: [PERMISSIONS.TOKENS_READ, PERMISSIONS.TOKENS_WRITE],
  prices: [PERMISSIONS.PRICES_READ, PERMISSIONS.PRICES_WRITE],
  admin: [PERMISSIONS.ADMIN_ROLES, PERMISSIONS.ADMIN_AUDIT, PERMISSIONS.ADMIN_SETTINGS],
} as const;

// ============================================================================
// Types for session user with RBAC
// ============================================================================

export interface RBACUser {
  roles?: string[];
  permissions?: string[];
}

export interface RoleDefinition {
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  createdBy: string;
}

// ============================================================================
// Permission Checking Helper
// ============================================================================

import clientPromise from './mongoclient';

/**
 * Check if a user has a specific permission
 * Checks direct permissions first, then role-based permissions
 */
export async function hasPermission(
  user: RBACUser | null | undefined,
  permission: Permission
): Promise<boolean> {
  if (!user) return false;

  // Check direct permissions first
  if (user.permissions?.includes(permission)) {
    return true;
  }

  // If no roles, no further permissions to check
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  // Query role definitions for the user's roles
  try {
    const client = await clientPromise;
    const db = client.db('main');
    const roleDefinitions = await db
      .collection<RoleDefinition>('role-definitions')
      .find({ name: { $in: user.roles } })
      .toArray();

    // Check if any role has the required permission
    return roleDefinitions.some((role) => role.permissions.includes(permission));
  } catch (error) {
    console.error('Error checking role permissions:', error);
    return false;
  }
}

/**
 * Check if a user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  user: RBACUser | null | undefined,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(user, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  user: RBACUser | null | undefined,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(user, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Get all permissions for a user (direct + role-based)
 * Used by session callback to populate session.user.permissions
 */
export async function getAllUserPermissions(user: RBACUser): Promise<string[]> {
  const permissions = new Set<string>(user.permissions || []);

  if (user.roles && user.roles.length > 0) {
    try {
      const client = await clientPromise;
      const db = client.db('main');
      const roleDefinitions = await db
        .collection<RoleDefinition>('role-definitions')
        .find({ name: { $in: user.roles } })
        .toArray();

      for (const role of roleDefinitions) {
        for (const perm of role.permissions) {
          permissions.add(perm);
        }
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  }

  return Array.from(permissions);
}
