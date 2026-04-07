/**
 * RBAC Seed API Route
 * POST /api/seed-rbac
 * 
 * Runs the RBAC seed script to initialize system roles and allowlist.
 * Only fryscrypto can execute this (hardcoded check).
 * Idempotent - safe to call multiple times.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { seedRBAC, isRBACSeeded } from '@/lib/seed-rbac';

// Hardcoded Super Admin username - only this user can run seed
const SUPER_ADMIN_USERNAME = 'fryscrypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);

  // Must be authenticated
  if (!session || !session.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Only fryscrypto can run seed (check by name, email, or any field containing the username)
  const userEmail = session.user.email?.toLowerCase() || '';
  const userName = session.user.name?.toLowerCase() || '';
  const isAllowed = 
    userEmail.includes(SUPER_ADMIN_USERNAME.toLowerCase()) ||
    userName.includes(SUPER_ADMIN_USERNAME.toLowerCase());

  if (!isAllowed) {
    res.status(403).json({ 
      message: 'Forbidden - only the Super Admin can run the seed script',
      user: session.user.email 
    });
    return;
  }

  try {
    // Check if already seeded
    const alreadySeeded = await isRBACSeeded();
    
    // Run the seed
    const result = await seedRBAC();

    res.status(200).json({
      message: alreadySeeded ? 'RBAC already seeded (idempotent run)' : 'RBAC seeded successfully',
      wasAlreadySeeded: alreadySeeded,
      result,
    });
  } catch (error: any) {
    console.error('Seed RBAC error:', error);
    res.status(500).json({ 
      message: 'Error running seed script',
      error: error.message 
    });
  }
}
