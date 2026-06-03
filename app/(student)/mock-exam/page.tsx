import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/helpers';
import { MockExamPlayer } from '@/components/features/MockExamPlayer';
import { Button } from '@/components/ui/Button';
import { Question, Chapter, Section, connectMongoose } from '@/lib/db/models';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mock Exam · Examina' };

export default async function MockExamPage() {
  await requireAuth();
  await connectMongoose();

  const chapters = await Chapter.find({ status: 'published' }).select('_id').lean();
  const sections = await Section.find({ chapterId: { $in: chapters.map((c) => c._id) } }).select('_id title').lean();
  const totalQ = await Question.countDocuments({ sectionId: { $in: sections.map((s) => s._id) }, flagSuspended: { $ne: true } });

  if (totalQ < 5) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-4xl">📝</p>
        <p className="mt-4 font-display text-2xl text-ink">Not enough questions</p>
        <p className="mt-2 text-sm text-inkMuted">
          You need at least 5 practice questions generated before taking a mock exam.
          Ask an admin to generate questions for your chapters.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block"><Button variant="ghost">← Dashboard</Button></Link>
      </div>
    );
  }

  return <MockExamPlayer totalAvailable={totalQ} />;
}
