import { put } from '@vercel/blob';
import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/helpers';
import { SUBJECTS_BY_CLASS, chapterFilterFor } from '@/lib/curriculum';
import { Chapter, Paper, Question, Section, connectMongoose } from '@/lib/db/models';
import { extractPaperQuestions } from '@/lib/teaching/extract-paper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Vercel caps request bodies at ~4.5 MB, so the two PDFs share a combined budget.
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const MetaSchema = z.object({
  kind: z.enum(['pyq', 'sample_paper']),
  classLevel: z.coerce.number().pipe(z.union([z.literal(10), z.literal(12)])),
  subject: z.enum(['maths', 'science', 'physics', 'chemistry', 'biology']),
  year: z.coerce.number().int().min(2000).max(2100),
  setLabel: z.string().trim().max(60).default(''),
});

function isPdf(f: FormDataEntryValue | null): f is File {
  return f instanceof File && f.size > 0 && f.name.toLowerCase().endsWith('.pdf');
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const meta = MetaSchema.safeParse({
    kind: form.get('kind'),
    classLevel: form.get('classLevel'),
    subject: form.get('subject'),
    year: form.get('year'),
    setLabel: form.get('setLabel') ?? '',
  });
  if (!meta.success) return NextResponse.json({ error: 'Invalid paper details' }, { status: 400 });
  const m = meta.data;
  if (!SUBJECTS_BY_CLASS[m.classLevel].includes(m.subject)) {
    return NextResponse.json({ error: `Class ${m.classLevel} has no ${m.subject}` }, { status: 400 });
  }

  const paperFile = form.get('paper');
  const keyFile = form.get('answerKey');
  if (!isPdf(paperFile)) {
    return NextResponse.json({ error: 'Attach the question paper as a .pdf' }, { status: 400 });
  }
  const key = isPdf(keyFile) ? keyFile : null;
  if (paperFile.size + (key?.size ?? 0) > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'PDFs must total 4 MB or less.' }, { status: 400 });
  }

  await connectMongoose();

  const chapters = await Chapter.find(chapterFilterFor(m.classLevel, m.subject))
    .select('_id title')
    .lean();
  if (chapters.length === 0) {
    return NextResponse.json(
      { error: `No Class ${m.classLevel} ${m.subject} chapters found. Create them first (set NCERT class and subject on the chapter) so questions can be mapped to sections.` },
      { status: 409 },
    );
  }
  const sections = await Section.find({ chapterId: { $in: chapters.map((c) => c._id) } })
    .select('_id chapterId title')
    .lean();
  const chapterTitle = new Map(chapters.map((c) => [c._id.toString(), c.title]));

  const paperBuf = Buffer.from(await paperFile.arrayBuffer());
  const keyBuf = key ? Buffer.from(await key.arrayBuffer()) : null;

  let extracted;
  try {
    extracted = await extractPaperQuestions(paperBuf, keyBuf, {
      classLevel: m.classLevel,
      subject: m.subject,
      year: m.year,
      kind: m.kind,
      hasAnswerKey: keyBuf !== null,
      sections: sections.map((s) => ({
        id: s._id.toString(),
        chapterTitle: chapterTitle.get(s.chapterId.toString()) ?? '',
        sectionTitle: s.title,
      })),
    });
  } catch (err) {
    console.error('Paper extraction failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 502 },
    );
  }

  const stamp = Date.now();
  const safe = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_');
  const [paperBlob, keyBlob] = await Promise.all([
    put(`papers/${stamp}-${safe(paperFile.name)}`, paperBuf, {
      access: 'public',
      contentType: 'application/pdf',
    }),
    key && keyBuf
      ? put(`papers/${stamp}-key-${safe(key.name)}`, keyBuf, {
          access: 'public',
          contentType: 'application/pdf',
        })
      : Promise.resolve(null),
  ]);

  const label = `${m.kind === 'pyq' ? 'CBSE' : 'Sample'} ${m.year}${m.setLabel ? ` · ${m.setLabel}` : ''}`;
  const paper = await Paper.create({
    title: `Class ${m.classLevel} ${m.subject} — ${label}`,
    kind: m.kind,
    classLevel: m.classLevel,
    subject: m.subject,
    year: m.year,
    setLabel: m.setLabel,
    sourceUrl: paperBlob.url,
    answerKeyUrl: keyBlob?.url ?? null,
    status: 'draft',
    createdBy: new Types.ObjectId(admin.id),
  });

  const sectionChapter = new Map(sections.map((s) => [s._id.toString(), s.chapterId]));
  await Question.insertMany(
    extracted.map((q) => ({
      sectionId: q.sectionId ? new Types.ObjectId(q.sectionId) : undefined,
      chapterId: q.sectionId ? sectionChapter.get(q.sectionId) : undefined,
      text: q.text,
      context: q.context,
      type: q.type,
      marks: q.marks,
      difficulty: q.marks >= 4 ? 3 : q.marks >= 2 ? 2 : 1,
      options: q.options,
      correctIndex: q.correctIndex ?? undefined,
      solution: q.solution || 'See marking scheme.',
      markingScheme: q.markingScheme,
      conceptTags: q.conceptTags,
      timeExpectedSeconds: Math.max(30, q.marks * 90),
      source: m.kind,
      reviewStatus: 'pending',
      paperId: paper._id,
      paperYear: m.year,
      paperLabel: label,
      paperQuestionNo: q.questionNo,
      hasFigure: q.hasFigure,
      answerFromKey: q.answerFromKey,
    })),
  );

  return NextResponse.json({ paperId: paper._id.toString(), count: extracted.length });
}
