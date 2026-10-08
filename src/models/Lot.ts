import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILotAgentStatus {
  agentId: mongoose.Types.ObjectId;
  agentName: string;
  agentEmail: string;
  status: "in_progress" | "submitted" | "completed";
  invoiceId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
}

export interface ILotDocument extends Document {
  lotNumber: number; // e.g. 1, 2, 3...
  lotCode: string; // e.g. "PERIOD 001" or "LOT 001"
  name?: string; // e.g. "ALC - Week Oct 01 to Oct 07"
  agencyName?: string; // Target partner agency (e.g. "ALC", "A&A HEALTH SERVICE")
  periodStart: Date;
  periodEnd: Date;
  status: "open" | "closed";
  notes?: string;
  agentStatuses: ILotAgentStatus[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LotAgentStatusSchema = new Schema<ILotAgentStatus>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    agentName: { type: String, required: true },
    agentEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "completed"],
      default: "in_progress",
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    invoiceNumber: { type: String },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const LotSchema = new Schema<ILotDocument>(
  {
    lotNumber: { type: Number, required: true, index: true },
    lotCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    agencyName: { type: String, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    notes: { type: String, trim: true },
    agentStatuses: { type: [LotAgentStatusSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Lot: Model<ILotDocument> =
  mongoose.models.Lot || mongoose.model<ILotDocument>("Lot", LotSchema);
