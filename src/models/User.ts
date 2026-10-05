import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "manager" | "viewer";
  isActive: boolean;
  invitedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "viewer"],
      default: "viewer",
    },
    isActive: { type: Boolean, default: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
