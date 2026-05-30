import { webcrypto } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '@/env';

// Node 20+ exposes globalThis.crypto automatically; Node 18 doesn't. Mongoose's
// bundled mongodb driver calls into globalThis.crypto for SCRAM auth, so shim
// it when missing. Safe no-op on Node 20+.
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

/**
 * Lazy, globalThis-cached Mongoose connection. Separate from the native
 * MongoClient that the auth adapter owns — both hit the same Atlas cluster
 * but use independent connection pools.
 *
 * Call `await connectMongoose()` at the start of any server action or route
 * handler that uses a Mongoose model.
 */

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectMongoose(): Promise<typeof mongoose> {
  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(env.MONGODB_URI);
  }
  return global._mongooseConn;
}
