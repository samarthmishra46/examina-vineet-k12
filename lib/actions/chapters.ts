'use server';

import { del, put } from '@vercel/blob';
import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';
import { extractTextFromPdf } from '@/lib/pdf/parse-pdf';
import { generateRoadmap } from '@/lib/teaching/generate-roadmap';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_EXTRACTED_CHARS = 500;

const CreateChapterMetaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  ncertClass: z.string().max(30).optional().default(''),
  ncertSubject: z.string().max(50).optional().default(''),
  examWeightPct: z.coerce.number().min(0).max(100).optional().default(0),
});

/**
 * Server action invoked by the New Chapter form.
 * Accepts either pasted text or a PDF upload, generates a roadmap via Claude,
 * persists chapter + sections, and redirects to the editor.
 */
export async function createChapter(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await connectMongoose();

  const rawTitle = formData.get('title');
  const rawDescription = formData.get('description');
  const sourceType = formData.get('sourceType');

  const meta = CreateChapterMetaSchema.parse({
    title: typeof rawTitle === 'string' ? rawTitle.trim() : '',
    description: typeof rawDescription === 'string' ? rawDescription.trim() : '',
    ncertClass: formData.get('ncertClass') ?? '',
    ncertSubject: formData.get('ncertSubject') ?? '',
    examWeightPct: formData.get('examWeightPct') ?? 0,
  });

  let sourceContent = '';
  let sourceUrl: string | null = null;

  if (sourceType === 'text') {
    const raw = formData.get('sourceContent');
    if (typeof raw !== 'string' || raw.trim().length < MIN_EXTRACTED_CHARS) {
      throw new Error(`Pasted text must be at least ${MIN_EXTRACTED_CHARS} characters.`);
    }
    sourceContent = raw.trim();
  } else if (sourceType === 'pdf') {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new Error('No PDF file provided.');
    }
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('PDF exceeds the 10 MB limit.');
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('File must be a .pdf');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    sourceContent = await extractTextFromPdf(buffer);

    if (sourceContent.length < MIN_EXTRACTED_CHARS) {
      throw new Error(
        'Extracted text is very short. The PDF may be scanned without OCR — try a text-based PDF.',
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blob = await put(`chapters/${Date.now()}-${safeName}`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });
    sourceUrl = blob.url;
  } else {
    throw new Error('Invalid source type.');
  }

  const chapter = await Chapter.create({
    title: meta.title,
    description: meta.description,
    sourceType,
    sourceContent,
    sourceUrl,
    status: 'draft',
    createdBy: new Types.ObjectId(admin.id),
    ncertClass: meta.ncertClass,
    ncertSubject: meta.ncertSubject,
    examWeightPct: meta.examWeightPct,
  });

  try {
    const sections = await generateRoadmap(sourceContent);
    await Section.insertMany(
      sections.map((s) => ({
        chapterId: chapter._id,
        order: s.order,
        title: s.title,
        description: s.description,
        learningObjectives: s.learningObjectives,
        estimatedMinutes: s.estimatedMinutes,
      })),
    );
  } catch (err) {
    // Roll back so we don't leave an orphan chapter + Blob asset on Claude failure.
    await Chapter.deleteOne({ _id: chapter._id });
    if (sourceUrl) {
      try {
        await del(sourceUrl);
      } catch {
        // Best-effort cleanup; ignore.
      }
    }
    throw err;
  }

  revalidatePath('/admin/chapters');
  redirect(`/admin/chapters/${chapter._id.toString()}/edit`);
}

const UpdateChapterMetaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
});

export async function updateChapterMeta(
  chapterId: string,
  patch: { title: string; description: string },
): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  const parsed = UpdateChapterMetaSchema.parse(patch);
  await Chapter.updateOne({ _id: chapterId }, { $set: parsed });
  revalidatePath(`/admin/chapters/${chapterId}/edit`);
  revalidatePath('/admin/chapters');
}

const UpdateSectionPatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  learningObjectives: z.array(z.string().min(1)).max(8).optional(),
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
});

export async function updateSection(
  sectionId: string,
  patch: z.infer<typeof UpdateSectionPatchSchema>,
): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  const parsed = UpdateSectionPatchSchema.parse(patch);
  const section = await Section.findById(sectionId).select('chapterId').lean();
  await Section.updateOne({ _id: sectionId }, { $set: parsed });
  if (section) revalidatePath(`/admin/chapters/${section.chapterId.toString()}/edit`);
}

export async function deleteSection(sectionId: string): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  const section = await Section.findById(sectionId).select('chapterId').lean();
  await Section.deleteOne({ _id: sectionId });
  if (section) revalidatePath(`/admin/chapters/${section.chapterId.toString()}/edit`);
}

export async function addSection(chapterId: string): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  const lastSection = await Section.findOne({ chapterId }).sort({ order: -1 }).lean();
  const nextOrder = (lastSection?.order ?? 0) + 1;
  await Section.create({
    chapterId,
    order: nextOrder,
    title: 'New section',
    description: '',
    learningObjectives: [],
    estimatedMinutes: 5,
  });
  revalidatePath(`/admin/chapters/${chapterId}/edit`);
}

export async function reorderSections(chapterId: string, orderedIds: string[]): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  const ops = orderedIds.map((id, idx) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(id) },
      update: { $set: { order: idx + 1 } },
    },
  }));
  if (ops.length > 0) await Section.bulkWrite(ops);
  revalidatePath(`/admin/chapters/${chapterId}/edit`);
}

export async function publishChapter(chapterId: string): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  await Chapter.updateOne({ _id: chapterId }, { $set: { status: 'published' } });
  revalidatePath('/admin/chapters');
  revalidatePath(`/admin/chapters/${chapterId}/edit`);
}

export async function unpublishChapter(chapterId: string): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  await Chapter.updateOne({ _id: chapterId }, { $set: { status: 'draft' } });
  revalidatePath('/admin/chapters');
  revalidatePath(`/admin/chapters/${chapterId}/edit`);
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await requireAdmin();
  await connectMongoose();
  const chapter = await Chapter.findById(chapterId).select('sourceUrl').lean();
  await Section.deleteMany({ chapterId });
  await Chapter.deleteOne({ _id: chapterId });
  if (chapter?.sourceUrl) {
    try {
      await del(chapter.sourceUrl);
    } catch {
      // Best-effort cleanup; ignore.
    }
  }
  revalidatePath('/admin/chapters');
  redirect('/admin/chapters');
}

/**
 * Batch action: accepts a single PDF with shared NCERT metadata.
 * Called in a loop from the batch-upload UI — each call creates one chapter.
 * The title is auto-derived from the PDF filename; admin can edit later.
 */
export async function createChaptersFromPdfs(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await connectMongoose();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No PDF file.');
  if (file.size > MAX_PDF_BYTES) throw new Error('PDF exceeds 10 MB limit.');
  if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Must be a .pdf');

  const ncertClass = typeof formData.get('ncertClass') === 'string' ? (formData.get('ncertClass') as string) : '';
  const ncertSubject = typeof formData.get('ncertSubject') === 'string' ? (formData.get('ncertSubject') as string) : '';

  const buffer = Buffer.from(await file.arrayBuffer());
  const sourceContent = await extractTextFromPdf(buffer);

  if (sourceContent.length < MIN_EXTRACTED_CHARS) {
    throw new Error(`"${file.name}": extracted text too short — may be a scanned PDF.`);
  }

  // Derive a clean title from filename: "leph101.pdf" → "leph101"
  const rawName = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim();
  // Ask Claude to derive the real chapter title from the extracted content
  // For now, use the filename as-is; admin can rename in the editor.
  const title = rawName || file.name;
  const description = `${ncertClass ? ncertClass + ' ' : ''}${ncertSubject ? ncertSubject + ' — ' : ''}Chapter from ${file.name}`;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = await put(`chapters/${Date.now()}-${safeName}`, buffer, {
    access: 'public',
    contentType: 'application/pdf',
  });

  const chapter = await Chapter.create({
    title,
    description,
    sourceType: 'pdf',
    sourceContent,
    sourceUrl: blob.url,
    status: 'draft',
    createdBy: new Types.ObjectId(admin.id),
    ncertClass,
    ncertSubject,
    examWeightPct: 0,
  });

  try {
    const sections = await generateRoadmap(sourceContent);
    await Section.insertMany(
      sections.map((s) => ({
        chapterId: chapter._id,
        order: s.order,
        title: s.title,
        description: s.description,
        learningObjectives: s.learningObjectives,
        estimatedMinutes: s.estimatedMinutes,
      })),
    );
  } catch (err) {
    await Chapter.deleteOne({ _id: chapter._id });
    try { await del(blob.url); } catch { /* ignore */ }
    throw err;
  }

  revalidatePath('/admin/chapters');
}
