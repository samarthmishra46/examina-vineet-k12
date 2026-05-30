import mongoose from 'mongoose';
import { connectMongoose } from '@/lib/db/models';

/**
 * One-off DB fix. A previous schema version created a UNIQUE index on
 * `progresses.userId` alone, which prevents any user from having more than
 * one progress doc and 500s the lesson page. This script drops that bad
 * index. The schema's compound (userId, sectionId) unique index remains
 * and is correct.
 *
 * Safe to run multiple times — silently no-ops if the index is already gone.
 *
 * Run with: npm run db:fix-indexes
 */
async function main() {
  await connectMongoose();
  const collection = mongoose.connection.collection('progresses');

  const indexes = await collection.indexes();
  console.log(`✓ found ${indexes.length} indexes on progresses:`);
  for (const idx of indexes) {
    console.log(`  - ${idx.name}  ${JSON.stringify(idx.key)}${idx.unique ? '  (unique)' : ''}`);
  }

  const bad = indexes.find((i) => i.name === 'userId_1');
  if (!bad) {
    console.log('\n✓ no bad userId_1 index — nothing to do.');
  } else {
    console.log('\n✗ dropping userId_1 (the bad one)…');
    await collection.dropIndex('userId_1');
    console.log('✓ dropped.');
  }

  // Make sure the correct compound index exists. Mongoose autoIndex usually
  // creates it on first connection, but being explicit doesn't hurt.
  const compoundExists = (await collection.indexes()).some(
    (i) => i.key.userId === 1 && i.key.sectionId === 1,
  );
  if (!compoundExists) {
    console.log('✗ compound (userId, sectionId) missing — creating…');
    await collection.createIndex({ userId: 1, sectionId: 1 }, { unique: true });
    console.log('✓ created.');
  } else {
    console.log('✓ compound (userId, sectionId) index already present.');
  }

  await mongoose.disconnect();
  console.log('\n✓ done');
}

main().catch((err) => {
  console.error('✗ fix-progress-indexes failed:', err);
  process.exit(1);
});
