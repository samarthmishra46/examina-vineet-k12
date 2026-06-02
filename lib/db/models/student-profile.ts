import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const StudentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    class: { type: Number, required: true, min: 6, max: 12 },
    board: { type: String, required: true }, // 'CBSE' | 'ICSE' | 'State' | other
    goalType: {
      type: String,
      enum: ['boards_90', 'jee', 'neet', 'general', 'weak_subject'],
      default: 'general',
    },
  },
  { timestamps: true },
);

export type StudentProfileAttrs = InferSchemaType<typeof StudentProfileSchema>;

export const StudentProfile: Model<StudentProfileAttrs> =
  (models.StudentProfile as Model<StudentProfileAttrs>) ??
  model<StudentProfileAttrs>('StudentProfile', StudentProfileSchema);
