import type { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongoclient';
import { getAllUserPermissions } from './permissions';

export const authOptions: NextAuthOptions = {
  jwt: {
    secret: process.env.NEXTAUTH_SECRET as string,
  },
  adapter: MongoDBAdapter(clientPromise, {
    collections: {
      Accounts: 'webaccounts',
      Sessions: 'websessions',
      Users: 'webusers',
      VerificationTokens: 'webverificationtokens',
    },
    databaseName: 'main',
  }),
  providers: [
    GithubProvider({
      clientId: (process.env.NODE_ENV === 'development'
        ? process.env.GITHUB_ID_DEV
        : process.env.GITHUB_ID) as string,
      clientSecret: (process.env.NODE_ENV === 'development'
        ? process.env.GITHUB_SECRET_DEV
        : process.env.GITHUB_SECRET) as string,
    }),
  ],
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if GitHub username is in allowlist
      // profile.login is the GitHub username
      const githubUsername = (profile as any)?.login;

      if (!githubUsername) {
        console.error('No GitHub username in profile');
        return '/login?error=NoUsername';
      }

      try {
        const client = await clientPromise;
        const db = client.db('main');

        // Case-insensitive lookup for enabled allowlist entry
        const allowed = await db.collection('github-allowlists').findOne({
          githubUsername: { $regex: new RegExp(`^${githubUsername}$`, 'i') },
          enabled: true,
        });

        if (!allowed) {
          console.warn(`GitHub user '${githubUsername}' not in allowlist or disabled`);
          return '/login?error=NotAllowed';
        }

        return true;
      } catch (error) {
        console.error('Error checking allowlist:', error);
        // Fail closed - deny access if we can't check the allowlist
        return '/login?error=AllowlistCheckFailed';
      }
    },

    async session({ session, user }) {
      // Attach full user object to session (preserves existing behavior)
      // @ts-ignore - attach full user on session as before
      session.user = user;

      // Populate roles and permissions from RBAC system
      const userDoc = user as any;
      const roles = userDoc.roles || [];
      const directPermissions = userDoc.permissions || [];

      // Resolve all permissions (direct + role-based)
      const allPermissions = await getAllUserPermissions({
        roles,
        permissions: directPermissions,
      });

      // @ts-ignore - extend session user with RBAC fields
      session.user.roles = roles;
      // @ts-ignore
      session.user.permissions = allPermissions;

      return session;
    },

    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
};
