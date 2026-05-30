import mongoose from 'mongoose';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';
import { streamLesson } from '@/lib/teaching/generate-lesson';

/**
 * Stream a lesson directly via streamLesson() (bypasses HTTP and auth) so we
 * can prove the prompt + NDJSON parsing + Zod validation works end-to-end
 * against a real section in the DB.
 *
 * Usage:
 *   npm run lesson:smoke              # uses the first section of the first published chapter
 *   npm run lesson:smoke <sectionId>  # uses a specific section
 */
async function main() {
  await connectMongoose();
  console.log('✓ connected to Mongo');

  const sectionIdArg = process.argv[2];

  let section;
  if (sectionIdArg) {
    section = await Section.findById(sectionIdArg).lean();
    if (!section) throw new Error(`No section with id ${sectionIdArg}`);
  } else {
    const chapter = await Chapter.findOne({ status: 'published' }).sort({ updatedAt: -1 }).lean();
    if (!chapter) throw new Error('No published chapter found. Publish one first.');
    section = await Section.findOne({ chapterId: chapter._id }).sort({ order: 1 }).lean();
    if (!section) throw new Error('Chapter has no sections.');
  }

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter) throw new Error('Section refers to a missing chapter.');

  console.log(`✓ teaching: "${section.title}" (from "${chapter.title}")\n`);

  let count = 0;
  const startedAt = Date.now();

  for await (const cmd of streamLesson({
    chapterTitle: chapter.title,
    chapterDescription: chapter.description ?? '',
    sectionTitle: section.title,
    sectionDescription: section.description ?? '',
    learningObjectives: section.learningObjectives ?? [],
  })) {
    count++;
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const summary = summarize(cmd);
    console.log(`  [${elapsed}s] ${summary}`);
  }

  const total = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n✓ ${count} commands in ${total}s`);

  await mongoose.disconnect();
}

function summarize(cmd: { type: string } & Record<string, unknown>): string {
  switch (cmd.type) {
    case 'narrate':
      return `narrate: "${truncate(String(cmd.text), 70)}"`;
    case 'draw_text':
      return `draw_text @(${cmd.x},${cmd.y}): "${truncate(String(cmd.text), 50)}"`;
    case 'draw_equation':
      return `draw_equation @(${cmd.x},${cmd.y}): ${truncate(String(cmd.latex), 50)}`;
    case 'draw_arrow':
      return `draw_arrow ${JSON.stringify(cmd.from)} → ${JSON.stringify(cmd.to)}`;
    case 'draw_line':
      return `draw_line ${JSON.stringify(cmd.from)} — ${JSON.stringify(cmd.to)}`;
    case 'draw_rectangle':
      return `draw_rectangle @(${cmd.x},${cmd.y}) ${cmd.width}x${cmd.height}${cmd.fill ? ` fill=${cmd.fill}` : ''}`;
    case 'draw_ellipse':
      return `draw_ellipse @(${cmd.x},${cmd.y}) ${cmd.width}x${cmd.height}${cmd.fill ? ` fill=${cmd.fill}` : ''}`;
    case 'draw_freehand': {
      const pts = cmd.points as Array<[number, number]>;
      return `draw_freehand ${pts.length} points`;
    }
    case 'highlight':
      return `highlight → ${cmd.targetId}`;
    case 'clear_board':
      return 'clear_board';
    case 'pause_for_doubts':
      return `pause_for_doubts: "${truncate(String(cmd.prompt), 50)}"`;
    case 'end_lesson':
      return 'end_lesson';
    default:
      return `unknown: ${cmd.type}`;
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

main().catch((err) => {
  console.error('✗ lesson smoke failed:', err);
  process.exit(1);
});
