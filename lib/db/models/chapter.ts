import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const ChapterSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sourceType: { type: String, enum: ['pdf', 'text'], required: true },
    sourceContent: { type: String, required: true },
    // Vercel Blob URL for the original PDF (only set when sourceType === 'pdf').
    sourceUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    // NCERT / board exam metadata (optional — set by admin)
    ncertClass: { type: String, default: '' },    // e.g. "Class 10"
    ncertSubject: { type: String, default: '' },  // e.g. "Mathematics"
    examWeightPct: { type: Number, default: 0 },  // % weight in board exam (0 = unknown)
  },
  { timestamps: true },
);

export type ChapterAttrs = InferSchemaType<typeof ChapterSchema>;

export const Chapter: Model<ChapterAttrs> =
  (models.Chapter as Model<ChapterAttrs>) ?? model<ChapterAttrs>('Chapter', ChapterSchema);
