import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { ObjectId } from 'mongodb';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { getMongoClient } from '@/lib/db/client';

export type UserRole = 'student' | 'admin';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role?: UserRole;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(getMongoClient),
  // Google provider auto-picks up AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from env.
  providers: [Google],
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session({ session, user }) {
      // Project id + role into the session so server components don't need
      // a second DB query to know who's signed in.
      session.user.id = user.id;
      session.user.role = (user as { role?: UserRole }).role ?? 'student';
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // The Mongo adapter has already inserted the user. Patch in the default
      // role so existing reads (and the session callback) see it.
      if (!user.id) return;
      const client = await getMongoClient();
      await client
        .db()
        .collection('users')
        .updateOne({ _id: new ObjectId(user.id) }, { $set: { role: 'student' satisfies UserRole } });
    },
  },
};
