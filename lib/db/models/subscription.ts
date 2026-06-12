import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const SubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true },
    // Mirrors Razorpay subscription status lifecycle
    status: {
      type: String,
      enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
      default: 'created',
      index: true,
    },
    trialEndDate: { type: Date, required: true },
    currentPeriodEnd: { type: Date, default: null },
  },
  { timestamps: true },
);

export type SubscriptionAttrs = InferSchemaType<typeof SubscriptionSchema>;

export const Subscription: Model<SubscriptionAttrs> =
  (models.Subscription as Model<SubscriptionAttrs>) ??
  model<SubscriptionAttrs>('Subscription', SubscriptionSchema);
