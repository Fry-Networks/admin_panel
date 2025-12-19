import NextAuth, { NextAuthOptions } from 'next-auth';
import 'dotenv/config';
import GithubProvider from 'next-auth/providers/github';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '../../../lib/mongoclient';
import { Adapter } from 'next-auth/adapters';
import { Session } from 'next-auth';
import { verifyFryNetworksMembership, getGuildMemberInfo } from '../../../lib/discord-utils';
import { getDiscordAccountCreationDate, CFIP_CONFIG } from '../../../lib/cfip-schema';

export const authOptions: NextAuthOptions = {
  jwt: { secret: process.env.NEXTAUTH_SECRET as string },
  adapter: MongoDBAdapter(clientPromise, { collections: { Accounts: 'webaccounts', Sessions: 'websessions', Users: 'webusers', VerificationTokens: 'webverificationtokens' }, databaseName: 'main' }) as Adapter,
  providers: [
    GithubProvider({
      clientId: (process.env.NODE_ENV === 'development' ? process.env.GITHUB_ID_DEV : process.env.GITHUB_ID) as string,
      clientSecret: (process.env.NODE_ENV === 'development' ? process.env.GITHUB_SECRET_DEV : process.env.GITHUB_SECRET) as string
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      authorization: { params: { scope: 'identify email guilds' } }
    })
  ],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, token, user }) {
      // @ts-ignore
      session.user = user;
      const client = await clientPromise;
      const db = client.db('main');
      const account = await db.collection('webaccounts').findOne({ userId: user.id });
      if (account) {
        // @ts-ignore
        session.user.provider = account.provider;
        // @ts-ignore
        session.user.providerAccountId = account.providerAccountId;
        if (account.provider === 'discord') {
          const cfipUser = await db.collection('cfip-users').findOne({ discordId: account.providerAccountId });
          if (cfipUser) {
            // @ts-ignore
            session.user.cfipEligible = cfipUser.isServerMember && cfipUser.accountCreatedAt && (Date.now() - new Date(cfipUser.accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24) >= CFIP_CONFIG.MIN_DISCORD_ACCOUNT_AGE_DAYS;
            // @ts-ignore
            session.user.isServerMember = cfipUser.isServerMember;
            // @ts-ignore
            session.user.serverJoinedAt = cfipUser.serverJoinedAt;
          }
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) { return baseUrl; },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && account.access_token) {
        const client = await clientPromise;
        const db = client.db('main');
        const membershipCheck = await verifyFryNetworksMembership(account.access_token);
        let serverJoinedAt: Date | null = null;
        if (membershipCheck.isMember && account.providerAccountId) {
          const memberInfo = await getGuildMemberInfo(account.providerAccountId);
          if (memberInfo?.joinedAt) serverJoinedAt = memberInfo.joinedAt;
        }
        const accountCreatedAt = getDiscordAccountCreationDate(account.providerAccountId!);
        const existingUser = await db.collection('cfip-users').findOne({ discordId: account.providerAccountId });
        await db.collection('cfip-users').updateOne(
          { discordId: account.providerAccountId },
          {
            $set: {
              discordId: account.providerAccountId, discordUsername: user.name || 'Unknown', discordAvatar: user.image, accountCreatedAt,
              isServerMember: membershipCheck.isMember, lastMembershipCheck: new Date(),
              ...(serverJoinedAt && !existingUser?.serverJoinedAt ? { serverJoinedAt } : {}),
              ...(!existingUser && membershipCheck.isMember && !serverJoinedAt ? { serverJoinedAt: new Date() } : {}),
              accessToken: account.access_token, refreshToken: account.refresh_token,
              tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              lastLogin: new Date()
            },
            $setOnInsert: { createdAt: new Date(), submissionCount: 0, lastSubmissionAt: null }
          },
          { upsert: true }
        );
        console.log(`Discord login: ${user.name} (${account.providerAccountId}) - Server member: ${membershipCheck.isMember}, Account age: ${Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24))} days`);
        return true;
      }
      return true;
    }
  },
  pages: { signIn: '/login' }
};

export default NextAuth(authOptions);

export interface MySession extends Session {
  user: { id: string; name: string; email: string; image: string; emailVerified: string | null; admin: boolean; owner: boolean; mods: boolean; provider?: 'github' | 'discord'; providerAccountId?: string; cfipEligible?: boolean; isServerMember?: boolean; serverJoinedAt?: Date; };
}
