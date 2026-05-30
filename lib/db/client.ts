import { MongoClient } from 'mongodb';
import { env } from '@/env';

/**
 * Lazy MongoClient factory. The connection isn't established until first
 * invocation, which keeps Next.js's build phase from opening a Mongo
 * connection on every route during page-data collection.
 *
 * Auth.js's MongoDBAdapter accepts a `() => Promise<MongoClient>` and calls
 * it on demand. In dev, we cache on globalThis so HMR doesn't open a new
 * connection on every reload.
 */

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(env.MONGODB_URI).connect();
    }
    return global._mongoClientPromise;
  }
  return new MongoClient(env.MONGODB_URI).connect();
}
