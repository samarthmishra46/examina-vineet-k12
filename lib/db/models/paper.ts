import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const PaperSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['pyq', 'sample_paper'], required: true },
    board: { type: String, enum: ['CBSE'], default: 'CBSE' },
    classLevel: { type: Number, enum: [10, 12], required: true },
    subject: {
      type: String,
      enum: ['maths', 'science', 'physics', 'chemistry', 'biology'],
      required: true,
    },
    year: { type: Number, required: true, min: 2000, max: 2100 },
    // e.g. "Set 1", "Outside Delhi", "Basic"
    setLabel: { type: String, default: '' },
    sourceUrl: { type: String, default: null },
    answerKeyUrl: { type: String, default: null },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

export type PaperAttrs = InferSchemaType<typeof PaperSchema>;

export const Paper: Model<PaperAttrs> =
  (models.Paper as Model<PaperAttrs>) ?? model<PaperAttrs>('Paper', PaperSchema);
