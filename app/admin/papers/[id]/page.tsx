import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { chapterFilterFor, type ClassLevel, type Subject } from '@/lib/curriculum';
import { Chapter, Paper, Question, Section, connectMongoose } from '@/lib/db/models';
import { PaperReview, type ReviewQuestion } from './PaperReview';

export const metadata: Metadata = {
  title: 'Review paper · Admin · Examina',
};

export default async function PaperReviewPage({ params }: { params: { id: string } }) {
  if (!isValidObjectId(params.id)) notFound();
  await connectMongoose();

  const paper = await Paper.findById(params.id).lean();
  if (!paper) notFound();

  const chapters = await Chapter.find(
    chapterFilterFor(paper.classLevel as ClassLevel, paper.subject as Subject),
  )
    .sort({ title: 1 })
    .select('_id title')
    .lean();
  const sections = await Section.find({ chapterId: { $in: chapters.map((c) => c._id) } })
    .sort({ order: 1 })
    .select('_id chapterId title')
    .lean();
  const chapterOrder = new Map(chapters.map((c, i) => [c._id.toString(), i]));
  const sectionOptions = sections
    .map((s) => ({
      id: s._id.toString(),
      label: `${chapters.find((c) => c._id.equals(s.chapterId))?.title ?? ''} → ${s.title}`,
      rank: chapterOrder.get(s.chapterId.toString()) ?? 0,
    }))
    .sort((a, b) => a.rank - b.rank);

  const questions = await Question.find({ paperId: paper._id }).sort({ paperQuestionNo: 1 }).lean();
  const rows: ReviewQuestion[] = questions.map((q) => ({
    id: q._id.toString(),
    questionNo: q.paperQuestionNo ?? 0,
    type: q.type ?? 'mcq',
    marks: q.marks ?? 1,
    context: q.context ?? '',
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex ?? null,
    solution: q.solution,
    markingScheme: q.markingScheme,
    sectionId: q.sectionId?.toString() ?? '',
    hasFigure: q.hasFigure ?? false,
    answerFromKey: q.answerFromKey ?? false,
    pending: q.reviewStatus === 'pending',
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin/papers" className="text-sm text-inkMuted hover:text-ink">
        ← Papers
      </Link>
      <h1 className="mt-6 font-display text-3xl tracking-tight text-ink">{paper.title}</h1>
      <p className="mt-2 text-sm text-inkMuted">
        {paper.status === 'published'
          ? 'Published — students can practise these questions.'
          : 'Draft — check each question, fix anything wrong, then publish.'}
        {paper.sourceUrl && (
          <>
            {' '}
            <a href={paper.sourceUrl} target="_blank" rel="noreferrer" className="text-accent underline">
              Open original PDF
            </a>
          </>
        )}
      </p>
      <PaperReview
        paperId={paper._id.toString()}
        published={paper.status === 'published'}
        hasAnswerKey={Boolean(paper.answerKeyUrl)}
        sections={sectionOptions.map(({ id, label }) => ({ id, label }))}
        initialQuestions={rows}
      />
    </div>
  );
}
