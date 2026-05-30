import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';
import { streamLesson } from '@/lib/teaching/generate-lesson';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel maxDuration cap (5 min). Long lessons fit comfortably within.
export const maxDuration = 300;

const RequestSchema = z.object({
  sectionId: z.string().min(1),
});

export async function POST(req: Request) {
  await requireAuth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { sectionId } = parsed.data;

  if (!isValidObjectId(sectionId)) {
    return NextResponse.json({ error: 'Invalid section id' }, { status: 400 });
  }

  await connectMongoose();

  const section = await Section.findById(sectionId).lean();
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter || chapter.status !== 'published') {
    return NextResponse.json({ error: 'Chapter not available' }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const cmd of streamLesson({
          chapterTitle: chapter.title,
          chapterDescription: chapter.description ?? '',
          sectionTitle: section.title,
          sectionDescription: section.description ?? '',
          learningObjectives: section.learningObjectives ?? [],
        })) {
          controller.enqueue(encoder.encode(JSON.stringify(cmd) + '\n'));
        }
      } catch (err) {
        console.error('[teach] stream error:', err);
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'end_lesson' }) + '\n'),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
