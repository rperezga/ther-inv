import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAgentVisitDocument extends Document {
  agentId: mongoose.Types.ObjectId;
  agentName: string;
  agentEmail: string;
  patientName: string;
  serviceType?: string;
  visitDates: string[]; // ISO string dates e.g. "2026-10-06"
  notes?: string;
  status: "pending" | "approved" | "invoiced";
  invoiceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentVisitSchema = new Schema<IAgentVisitDocument>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agentName: { type: String, required: true, trim: true },
    agentEmail: { type: String, required: true, trim: true, lowercase: true },
    patientName: { type: String, required: true, trim: true },
    serviceType: { type: String, default: "Visit", trim: true },
    visitDates: [{ type: String, required: true }],
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "invoiced"],
      default: "pending",
      index: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
  },
  { timestamps: true }
);

export const AgentVisit: Model<IAgentVisitDocument> =
  mongoose.models.AgentVisit ||
  mongoose.model<IAgentVisitDocument>("AgentVisit", AgentVisitSchema);
