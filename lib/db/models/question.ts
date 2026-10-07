import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const QuestionSchema = new Schema(
  {
    // Pending imported questions may not be mapped to a section yet; publishing requires one.
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required(this: { reviewStatus?: string }) {
        return this.reviewStatus !== 'pending';
      },
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      required(this: { reviewStatus?: string }) {
        return this.reviewStatus !== 'pending';
      },
    },
    text: { type: String, required: true, trim: true },
    // mcq / assertion_reason / case_based are objective (4 options); short / long are written.
    type: {
      type: String,
      enum: ['mcq', 'assertion_reason', 'case_based', 'short', 'long'],
      default: 'mcq',
    },
    marks: { type: Number, min: 1, max: 6, default: 1 },
    // Shared passage for case-based questions.
    context: { type: String, default: '' },
    // Written questions: step-wise board marking points (one string per point).
    markingScheme: { type: [String], default: [] },
    difficulty: { type: Number, enum: [1, 2, 3], required: true },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, min: 0, max: 3 },
    solution: { type: String, required: true },
    conceptTags: { type: [String], default: [] },
    commonMistakeTags: { type: [String], default: [] },
    timeExpectedSeconds: { type: Number, default: 60 },
    // 'generated' = Claude-written practice; 'pyq' / 'sample_paper' = imported board papers.
    // Only 'generated' questions are ever replaced by the admin generate route.
    source: { type: String, enum: ['generated', 'pyq', 'sample_paper'], default: 'generated' },
    // Imported papers start 'pending' until an admin reviews them; students never see pending
    // questions. Legacy and generated questions have no value here and count as approved.
    reviewStatus: { type: String, enum: ['pending', 'approved'], default: 'approved' },
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper', default: null },
    paperYear: { type: Number, default: null },
    paperLabel: { type: String, default: null },
    paperQuestionNo: { type: Number, default: null },
    // True when the printed question depends on a diagram that text extraction cannot capture.
    hasFigure: { type: Boolean, default: false },
    // True when the answer came from the supplied answer key, false when Claude solved it.
    answerFromKey: { type: Boolean, default: false },
    flagCount: { type: Number, default: 0 },
    flagSuspended: { type: Boolean, default: false },
  },
  { timestamps: true },
);

QuestionSchema.index({ sectionId: 1, difficulty: 1 });
QuestionSchema.index({ sectionId: 1, source: 1 });
QuestionSchema.index({ paperId: 1, reviewStatus: 1 });

export const WRITTEN_TYPES = ['short', 'long'] as const;

export type QuestionAttrs = InferSchemaType<typeof QuestionSchema>;

export const Question: Model<QuestionAttrs> =
  (models.Question as Model<QuestionAttrs>) ?? model<QuestionAttrs>('Question', QuestionSchema);
