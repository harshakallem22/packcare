import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    // Google OIDC `sub`. Null/absent for the dev-login demo user.
    googleSub: { type: String, default: null },
    email: { type: String, required: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Unique only among real Google accounts; dev users (null googleSub) are exempt.
userSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
);
userSchema.index({ email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
