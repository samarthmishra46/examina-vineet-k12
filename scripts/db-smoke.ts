import mongoose, { Types } from 'mongoose';
import { Chapter, LessonSession, Progress, Section, connectMongoose } from '@/lib/db/models';

/**
 * Round-trip smoke test: connect, write sample docs for each model, read
 * them back, delete them, disconnect. Exits non-zero on any failure.
 *
 * Run with: npm run db:smoke
 */
async function main() {
  await connectMongoose();
  console.log('✓ connected to Mongo');

  const fakeUserId = new Types.ObjectId();

  const chapter = await Chapter.create({
    title: '[smoke test] sample chapter',
    description: 'auto-created by db:smoke, will be deleted',
    sourceType: 'text',
    sourceContent: 'Lorem ipsum dolor sit amet.',
    status: 'draft',
    createdBy: fakeUserId,
  });
  console.log(`✓ created chapter ${chapter._id.toString()}`);

  const sections = await Section.insertMany([
    {
      chapterId: chapter._id,
      order: 1,
      title: 'Intro',
      description: 'Get oriented.',
      learningObjectives: ['know the basics'],
      estimatedMinutes: 5,
    },
    {
      chapterId: chapter._id,
      order: 2,
      title: 'Practice',
      description: 'Work an example.',
      learningObjectives: ['solve an example'],
      estimatedMinutes: 7,
    },
  ]);
  console.log(`✓ created ${sections.length} sections`);

  const firstSection = sections[0];
  if (!firstSection) throw new Error('insertMany returned no sections');

  const progress = await Progress.create({
    userId: fakeUserId,
    sectionId: firstSection._id,
    status: 'in_progress',
  });
  console.log(`✓ created progress ${progress._id.toString()}`);

  const lessonSession = await LessonSession.create({
    userId: fakeUserId,
    sectionId: firstSection._id,
  });
  console.log(`✓ created lesson session ${lessonSession._id.toString()}`);

  // Read back
  const fetchedChapter = await Chapter.findById(chapter._id).lean();
  const fetchedSections = await Section.find({ chapterId: chapter._id }).sort({ order: 1 }).lean();
  const fetchedProgress = await Progress.findOne({
    userId: fakeUserId,
    sectionId: firstSection._id,
  }).lean();

  if (!fetchedChapter) throw new Error('chapter read-back failed');
  if (fetchedSections.length !== 2) throw new Error(`expected 2 sections, got ${fetchedSections.length}`);
  if (!fetchedProgress) throw new Error('progress read-back failed');
  console.log('✓ read-back verified');

  // Cleanup
  await Progress.deleteOne({ _id: progress._id });
  await LessonSession.deleteOne({ _id: lessonSession._id });
  await Section.deleteMany({ chapterId: chapter._id });
  await Chapter.deleteOne({ _id: chapter._id });
  console.log('✓ cleaned up');

  await mongoose.disconnect();
  console.log('\n✓ Schemas verified end-to-end');
}

main().catch((err) => {
  console.error('✗ smoke test failed:', err);
  process.exit(1);
});
