import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILotDocument extends Document {
  lotNumber: number; // e.g. 1, 2, 3...
  lotCode: string; // e.g. "LOT 001" or "LOT-2026-001"
  name?: string; // Optional friendly label (e.g. "Week 40 Payroll")
  agencyName?: string; // Target partner agency (e.g. "ALC", "A&A HEALTH SERVICE")
  periodStart: Date;
  periodEnd: Date;
  status: "open" | "closed";
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Lot: Model<ILotDocument> =
  mongoose.models.Lot || mongoose.model<ILotDocument>("Lot", LotSchema);
