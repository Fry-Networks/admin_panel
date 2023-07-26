import NextAuth, { NextAuthOptions } from 'next-auth';
import 'dotenv/config';
import GithubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "../../../lib/mongoclient"
import { Adapter } from 'next-auth/adapters';
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
      
      databaseName: 'webauth',
  }) as Adapter,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    async session({ session, token, user }) {
      console.log(session, token, user)
      session.user = user;
      return session;
    }
  }
};

export default NextAuth(authOptions);
