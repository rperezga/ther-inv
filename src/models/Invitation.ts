import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvitationDocument extends Document {
  token: string;
  email: string;
  role: "admin" | "manager" | "viewer" | "agent";
  status: "pending" | "accepted" | "expired";
  invitedBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitationDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ["admin", "manager", "viewer", "agent"],
      default: "agent",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Invitation: Model<IInvitationDocument> =
  mongoose.models.Invitation || mongoose.model<IInvitationDocument>("Invitation", InvitationSchema);
