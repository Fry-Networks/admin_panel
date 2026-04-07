import { MongoClient } from 'mongodb';

declare module globalThis {
  var _mongoClientPromise: Promise<MongoClient>;
}

// NextAuth type extensions
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      name: string;
      email: string;
      image: string;
      // Legacy boolean flags (for backwards compatibility)
      admin: boolean;
      owner: boolean;
      mods: boolean;
      // RBAC fields
      roles: string[];
      permissions: string[];
    };
  }
}
