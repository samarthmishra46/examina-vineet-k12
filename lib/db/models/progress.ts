import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const ProgressSchema = new Schema(
  {
    // No `ref: 'User'` — the User collection is owned by @auth/mongodb-adapter,
    // not Mongoose. We store the ObjectId and look up via the native driver if needed.
    userId: { type: Schema.Types.ObjectId, required: true },
    sectionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Section',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One progress row per user per section. The compound index also serves
// "all progress for a user" queries via leftmost-prefix, so no separate
// lone-userId index is needed.
ProgressSchema.index({ userId: 1, sectionId: 1 }, { unique: true });

export type ProgressAttrs = InferSchemaType<typeof ProgressSchema>;

export const Progress: Model<ProgressAttrs> =
  (models.Progress as Model<ProgressAttrs>) ?? model<ProgressAttrs>('Progress', ProgressSchema);
